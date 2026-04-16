use super::NitroAttestationDocument;
use tracing::{info, warn};

/// Expected Platform Configuration Registers (PCRs) for the legitimate Atrosha Agent enclave.
/// In production, these should be loaded from a configuration file or environment variables.
const EXPECTED_PCR0: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const EXPECTED_PCR8: &str = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

#[derive(Debug)]
pub enum EnclaveError {
    InvalidDocument(String),
    PcrMismatch { pcr_index: usize, expected: String, actual: String },
    MissingPcr(usize),
}

impl std::fmt::Display for EnclaveError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidDocument(err) => write!(f, "Invalid Enclave Attestation Document: {}", err),
            Self::PcrMismatch { pcr_index, expected, actual } => {
                write!(f, "Enclave PCR{} mismatch. Expected: {}, Actual: {}", pcr_index, expected, actual)
            }
            Self::MissingPcr(idx) => write!(f, "Enclave Attestation missing PCR{}", idx),
        }
    }
}

use base64::engine::general_purpose::STANDARD as b64_std;
use base64::Engine;

/// Verifies the cryptographic identity of the calling agent by ensuring its
/// hardware-backed PCR hashes exactly match the expected authorized binary.
pub fn verify_enclave_attestation(attestation_base64: &str) -> Result<(), EnclaveError> {
    // 1. Decode base64 
    let payload = b64_std.decode(attestation_base64)
        .map_err(|e| EnclaveError::InvalidDocument(format!("Base64 decode failed: {}", e)))?;

    // 2. Parse CBOR / Cryptographically verify AWS root signature
    let doc = NitroAttestationDocument::parse_cbor(&payload)
        .map_err(|e| EnclaveError::InvalidDocument(e))?;

    info!("Verifying TEE Enclave Attestation: Module ID {}", doc.module_id);

    // 3. Verify hardware binding (PCR0 = Base Enclave Image, PCR8 = App File)
    verify_pcr(&doc, 0, EXPECTED_PCR0)?;
    verify_pcr(&doc, 8, EXPECTED_PCR8)?;

    info!("Hardware-Rooted Identity Verified. PCR hashes match.");
    Ok(())
}

fn verify_pcr(doc: &NitroAttestationDocument, index: usize, expected: &str) -> Result<(), EnclaveError> {
    let actual = doc.pcrs.get(&index)
        .ok_or(EnclaveError::MissingPcr(index))?;
    
    if actual != expected {
        warn!("🚨 TEE Attestation Failure: PCR{} mismatch. Malicious or outdated agent detected.", index);
        return Err(EnclaveError::PcrMismatch {
            pcr_index: index,
            expected: expected.to_string(),
            actual: actual.to_string(),
        });
    }
    
    Ok(())
}
