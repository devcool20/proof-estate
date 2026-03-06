# 📄 Testing Assets

To help you simulate the property verification flow, I have generated a **Sample Land Title Deed**.

### 🛠️ How to use
1. Go to the **Submit Asset** page.
2. When you reach the **Document Upload** step, you can use the sample deed found here:
   - `frontend/public/sample_land_deed.png`
3. You can also upload any of the PDFs in the `frontend/docs/` folder.

##Stop backend

Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess) -Force

##Start backend

cargo run

---
### 💡 How the Simulation Works
Regardless of the file you upload, the ProofEstate backend will:
1. **Hash the Document**: Computes a unique SHA-256 digital signature of the file.
2. **Anchor to Solana**: Stores this hash on-chain as immutable proof that this specific document was submitted at this specific time.
3. **Registry Verification**: In a real scenario, the Government Verifier would compare this hash against their off-chain land registry.
