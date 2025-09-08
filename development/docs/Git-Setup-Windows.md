# Git Setup for Windows PowerShell

## Check if Git is Installed

Open PowerShell and run:
```powershell
git --version
```

If you see a version number (e.g., `git version 2.42.0.windows.1`), Git is installed.

If you get an error like "git is not recognized", you need to install Git.

## Installing Git on Windows

### Option 1: Git for Windows (Recommended)

1. Download Git from: https://git-scm.com/download/win
2. Run the installer with default settings
3. **Important**: During installation, select "Git from the command line and also from 3rd-party software"
4. After installation, restart PowerShell

### Option 2: Using Windows Package Manager (winget)

```powershell
winget install --id Git.Git -e --source winget
```

### Option 3: Using Chocolatey (if installed)

```powershell
choco install git
```

## Verify Git Works in PowerShell

After installation:

1. **Close and reopen PowerShell** (important!)
2. Test Git:
   ```powershell
   git --version
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## Using the Deployment Script

Once Git is installed, the deployment script will work:

```powershell
# Fresh deployment
.\deploy-production.ps1 -GitRepo "https://github.com/YOUR_USERNAME/orvale-management-system.git"

# Update existing deployment
.\deploy-production.ps1 -Update
```

## Troubleshooting

### "git is not recognized" after installation

1. Check if Git is in PATH:
   ```powershell
   $env:Path -split ';' | Select-String 'git'
   ```

2. If not found, add Git to PATH manually:
   - Default Git location: `C:\Program Files\Git\cmd`
   - Add to system PATH:
     ```powershell
     [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Git\cmd", [EnvironmentVariableTarget]::Machine)
     ```
   - Restart PowerShell

### Permission Issues with HTTPS Repositories

If you get authentication errors with HTTPS:

1. For public repos: No authentication needed
2. For private repos: Windows will prompt for credentials
3. To save credentials:
   ```powershell
   git config --global credential.helper wincred
   ```

### Using SSH Instead of HTTPS

For SSH authentication:
```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add key to ssh-agent
Start-Service ssh-agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
```
Then add the public key to your GitHub/GitLab account.

## Testing Git Access

Test repository access without cloning:
```powershell
# For HTTPS
git ls-remote https://github.com/YOUR_USERNAME/orvale-management-system.git

# For SSH
git ls-remote git@github.com:YOUR_USERNAME/orvale-management-system.git
```

If this works, the deployment script will work!