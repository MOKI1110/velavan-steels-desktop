# Release Workflow Rules
When asked to commit, push, build, or create a latest release, execute the entire workflow autonomously without asking for step-by-step confirmation.

0. **Pre-flight Checks**: Run linting and tests to ensure code stability (if scripts exist). Ensure project dependencies are installed (`npm install` or `npm ci`).
1. **Commit Changes**: Stage and commit the requested changes.
2. **Bump Version**: Navigate to the `electron-app` directory and bump the version in `package.json` (e.g. `npm version patch`). Note: `npm version` automatically creates a new commit and a git tag (e.g., `v1.0.8`).
3. **Push to GitHub**: Push the main branch and tags to the remote repository: `git push origin main --tags`.
4. **Load GitHub Token**: Parse your `.env` file at the root of the project to retrieve the `GH_TOKEN`. *(Ensure `.env` is strictly listed in `.gitignore` to prevent leaking secrets)*. Example PowerShell snippet:
   ```powershell
   $env:GH_TOKEN = (Get-Content .env -ErrorAction SilentlyContinue | Select-String "^GH_TOKEN=").ToString().Split("=")[1]
   ```
5. **Build and Publish**: Navigate to `electron-app` and run the electron-builder publish command with the token:
   ```powershell
   npx electron-builder --win -p always
   ```
   *(Note: Append `--mac` or `--linux` to this command if cross-platform builds are requested).*
6. **Verify Release**: Confirm that the `.exe` installers and the `latest.yml` update files were successfully uploaded to the corresponding GitHub Release page.