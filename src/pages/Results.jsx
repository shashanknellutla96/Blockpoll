import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { getContract } from '../blockchain/contract'
import { db } from '../firebase/config'
import { collection, getDocs } from 'firebase/firestore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function Results() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadResults = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    setError('')
    try {
      const contract = await getContract()
      const raw = await contract.getCandidates()

      const candidatesSnap = await getDocs(collection(db, 'candidates'))
      const candidatesMap = {}
      candidatesSnap.docs.forEach(doc => {
        candidatesMap[doc.id] = doc.data()
      })

      const parsed = raw.map(c => ({
        id: Number(c.id),
        name: c.name,
        voteCount: Number(c.voteCount),
        image: candidatesMap[String(Number(c.id))]?.image || null,
      }))
      setCandidates(parsed)
      setLastRefresh(new Date())
    } catch (err) {
      setError('Failed to fetch results: ' + err.message)
    }
    setLoading(false)
    if (isManual) setRefreshing(false)
  }

  useEffect(() => {
    loadResults()
    const interval = setInterval(() => loadResults(), 30000)
    return () => clearInterval(interval)
  }, [])

  const totalVotes = candidates.reduce((s, c) => s + c.voteCount, 0)
  const leader = candidates.length > 0
    ? candidates.reduce((a, b) => a.voteCount > b.voteCount ? a : b)
    : { name: '', voteCount: -1 }

  const sorted = [...candidates].sort((a, b) => b.voteCount - a.voteCount)

  const chartData = {
    labels: candidates.map(c => c.name),
    datasets: [{
      label: 'Votes',
      data: candidates.map(c => c.voteCount),
      backgroundColor: candidates.map(c =>
        c.id === leader.id && leader.voteCount > 0 ? 'rgba(0,255,136,0.5)' : 'rgba(0,212,255,0.3)'
      ),
      borderColor: candidates.map(c =>
        c.id === leader.id && leader.voteCount > 0 ? '#00ff88' : '#00d4ff'
      ),
      borderWidth: 1,
      borderRadius: 2,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#141c26',
        borderColor: '#243548',
        borderWidth: 1,
        titleColor: '#e2eaf4',
        bodyColor: '#8899aa',
        padding: 12,
        titleFont: { family: 'Syne', size: 13, weight: '700' },
        bodyFont: { family: 'JetBrains Mono', size: 11 },
        callbacks: {
          label: ctx => ` ${ctx.raw} vote${ctx.raw !== 1 ? 's' : ''} — ${totalVotes > 0 ? ((ctx.raw / totalVotes) * 100).toFixed(1) : 0}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(30,45,61,0.4)', drawBorder: false },
        ticks: { color: '#8899aa', font: { family: 'Syne', size: 12 } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(30,45,61,0.4)', drawBorder: false },
        ticks: { color: '#8899aa', font: { family: 'JetBrains Mono', size: 11 }, stepSize: 1 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen grid-bg" style={{ paddingTop: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono' }}>Reading results from blockchain...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg" style={{ paddingTop: '64px' }}>
      <div className="scan-line" />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px 64px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }} className="fade-in">
          <div>
            <div className="badge badge-green" style={{ marginBottom: '14px' }}>● Live Results</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              Election <span style={{ color: 'var(--accent)' }} className="text-glow">Results</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', margin: 0 }}>
              Data sourced directly from the Ethereum smart contract. Publicly verifiable.
            </p>
          </div>
          <button
            onClick={() => loadResults(true)}
            disabled={refreshing}
            className="btn-outline"
            style={{ fontSize: '12px', padding: '8px 18px', flexShrink: 0 }}
          >
            {refreshing ? '...' : '↻ Refresh'}
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '12px 16px', border: '1px solid var(--red)', background: 'rgba(255,61,90,0.08)', color: 'var(--red)', fontSize: '12px', fontFamily: 'JetBrains Mono', display: 'flex', gap: '8px' }}>
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }} className="fade-in-1">
          {[
            { value: totalVotes, label: 'Total Votes Cast', color: 'var(--accent)' },
            { value: candidates.length, label: 'Candidates', color: 'var(--green)' },
            { value: leader.name || '—', label: 'Current Leader', color: 'var(--amber)', small: true },
          ].map(({ value, label, color, small }) => (
            <div key={label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: small ? '1.1rem' : '2rem', fontWeight: 700, color, lineHeight: 1.2, marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        {candidates.length > 0 ? (
          <div className="card bracket-box fade-in-2" style={{ padding: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Vote Distribution
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>
                {totalVotes} total votes
              </div>
            </div>
            <div style={{ height: '260px' }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '48px', textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '2rem', color: 'var(--text3)', marginBottom: '12px' }}>◈</div>
            <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>No candidates found on the contract.</p>
          </div>
        )}

        {/* ── Candidate Breakdown ── */}
        <div className="fade-in-3">
          <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Candidate Breakdown
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sorted.map((c, i) => {
              const pct = totalVotes > 0 ? (c.voteCount / totalVotes) * 100 : 0
              const isLeader = c.voteCount === leader.voteCount && leader.voteCount > 0
              return (
                <div key={c.id} className="card" style={{ padding: '20px', borderColor: isLeader ? 'rgba(0,255,136,0.25)' : undefined, transition: 'border-color 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Rank diamond */}
                      <div style={{ width: '28px', height: '28px', border: `1px solid ${isLeader ? 'var(--green)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)', flexShrink: 0 }}>
                        <span style={{ transform: 'rotate(-45deg)', fontSize: '10px', color: isLeader ? 'var(--green)' : 'var(--text3)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                          {i + 1}
                        </span>
                      </div>
                      {c.image && (
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface2)', flexShrink: 0 }}>
                          <img src={c.image} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>{c.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>Candidate #{c.id}</div>
                      </div>
                      {isLeader && <div className="badge badge-green">▲ Leading</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: isLeader ? 'var(--green)' : 'var(--text)' }}>{c.voteCount}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>{pct.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '3px', background: 'var(--surface2)', width: '100%', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: isLeader ? 'var(--green)' : 'var(--accent)',
                      boxShadow: isLeader ? '0 0 8px var(--green)' : '0 0 8px var(--accent)',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              )
            })}

            {candidates.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>No candidates to display.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        {lastRefresh && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
            <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
            <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
              Last synced: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
            </p>
            <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}