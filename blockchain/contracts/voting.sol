// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {

    // ── Data Structures ──────────────────────────────────────
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    // ── State Variables ───────────────────────────────────────
    address public owner;
    bool public votingOpen;

    Candidate[] private candidates;
    mapping(address => bool) private voted;

    // ── Events ────────────────────────────────────────────────
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event CandidateAdded(uint256 indexed id, string name);
    event VotingOpened();
    event VotingClosed();

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this.");
        _;
    }

    modifier whenOpen() {
        require(votingOpen, "Voting is not open.");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        votingOpen = false;
    }

    // ── Admin Functions ───────────────────────────────────────
    function addCandidate(string memory _name) public onlyOwner {
        require(!votingOpen, "Cannot add candidates while voting is open.");
        require(bytes(_name).length > 0, "Candidate name cannot be empty.");
        uint256 id = candidates.length;
        candidates.push(Candidate(id, _name, 0));
        emit CandidateAdded(id, _name);
    }

    function openVoting() public onlyOwner {
        require(candidates.length > 0, "Add at least one candidate first.");
        require(!votingOpen, "Voting is already open.");
        votingOpen = true;
        emit VotingOpened();
    }

    function closeVoting() public onlyOwner {
        require(votingOpen, "Voting is already closed.");
        votingOpen = false;
        emit VotingClosed();
    }

    // ── Voter Functions ───────────────────────────────────────
    function castVote(uint256 _candidateId) public whenOpen {
        require(!voted[msg.sender], "You have already voted.");
        require(_candidateId < candidates.length, "Invalid candidate ID.");

        voted[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, _candidateId);
    }

    // ── View Functions ────────────────────────────────────────
    function getCandidates() public view returns (Candidate[] memory) {
        return candidates;
    }

    function hasVoted(address _voter) public view returns (bool) {
        return voted[_voter];
    }

    function getCandidateCount() public view returns (uint256) {
        return candidates.length;
    }
}