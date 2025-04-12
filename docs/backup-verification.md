# Backup Verification Process

This document outlines the steps required to verify the integrity of backups created by the automated GitHub Actions workflow.

## Verification Steps

1. **Generate Checksums**  
   Before verification, ensure you have generated SHA256 checksums for all critical files in the `/submission/` directory:
   ```bash
   sha256sum submission/* > submission/checksums.sha256
   ```

2. **Run Verification Script**  
   Execute the verification script to validate file integrity:
   ```bash
   bash submission/verify-backup.sh
   ```

3. **Review Results**  
   - If the verification is successful, you will see:
     ```
     Backup verification successful.
     ```
   - If the verification fails, you will see:
     ```
     Backup verification failed!
     ```
     In case of failure, investigate the discrepancies immediately.

## Troubleshooting

- Ensure the `checksums.sha256` file is up-to-date.
- Confirm that no files have been modified unintentionally since checksum generation.
- Re-run checksum generation if necessary and repeat the verification process.

## Automation

Consider automating checksum generation and verification as part of your CI/CD pipeline to ensure continuous integrity checks.