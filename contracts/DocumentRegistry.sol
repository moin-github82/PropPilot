// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * PropHealth Document Registry
 *
 * Stores SHA-256 hashes of property documents on Polygon.
 * Actual files live in cloud storage; this contract provides
 * a tamper-proof, timestamped proof of existence for each document.
 *
 * Deploy to Polygon Amoy testnet for development,
 * Polygon mainnet for production.
 */
contract DocumentRegistry {

    // ── Types ────────────────────────────────────────────────────────────────

    enum DocType { EPC, PropertyReport, Survey, LegalDoc, Other }

    struct Document {
        bytes32   hash;          // SHA-256 of the file content
        DocType   docType;
        string    postcode;      // UK postcode this document relates to
        string    fileName;      // original file name (for display only)
        address   registeredBy;  // wallet that paid gas to register
        uint256   timestamp;     // block.timestamp at registration
        bool      exists;
    }

    // ── State ────────────────────────────────────────────────────────────────

    mapping(bytes32 => Document) private _documents;
    uint256 public totalDocuments;

    // ── Events ───────────────────────────────────────────────────────────────

    event DocumentRegistered(
        bytes32 indexed hash,
        DocType indexed docType,
        string  postcode,
        string  fileName,
        address indexed registeredBy,
        uint256 timestamp
    );

    // ── Write ────────────────────────────────────────────────────────────────

    /**
     * Register a document hash on-chain.
     * Reverts if the same hash has already been registered
     * (guarantees each document appears exactly once).
     */
    function registerDocument(
        bytes32       _hash,
        DocType       _docType,
        string calldata _postcode,
        string calldata _fileName
    ) external {
        require(!_documents[_hash].exists, "DocumentRegistry: hash already registered");

        _documents[_hash] = Document({
            hash:         _hash,
            docType:      _docType,
            postcode:     _postcode,
            fileName:     _fileName,
            registeredBy: msg.sender,
            timestamp:    block.timestamp,
            exists:       true
        });

        totalDocuments++;

        emit DocumentRegistered(
            _hash, _docType, _postcode, _fileName, msg.sender, block.timestamp
        );
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    /**
     * Verify whether a document hash is registered.
     * Returns all metadata if found, or exists=false if not.
     */
    function verifyDocument(bytes32 _hash)
        external view
        returns (
            bool    exists,
            uint8   docType,
            string memory postcode,
            string memory fileName,
            address registeredBy,
            uint256 timestamp
        )
    {
        Document storage doc = _documents[_hash];
        return (
            doc.exists,
            uint8(doc.docType),
            doc.postcode,
            doc.fileName,
            doc.registeredBy,
            doc.timestamp
        );
    }
}
