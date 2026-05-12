##############################################################################
# Blackbox CLI v2 Install Script for Windows PowerShell
#
# This script downloads and installs the Blackbox CLI v2 (Node.js-based)
# from the Extension Upload Service. Ready to run on any Windows system!
#
##############################################################################

# Unblock the script if it was downloaded from the internet to prevent "Run / Suspend" prompts
if ((Get-Command Unblock-File -ErrorAction SilentlyContinue) -and $PSCommandPath) {
    Unblock-File -Path $PSCommandPath -ErrorAction SilentlyContinue
}

$ErrorActionPreference = "Stop"

# --- Debug Mode Setup ---
$DEBUG = $env:BLACKBOX_CLI_DEBUG -eq "true"

function Debug-Log {
    param([string]$Message, [string]$Color = "Gray")
    if ($DEBUG) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# Progress indicator variables
$script:TOTAL_STEPS = 9
$script:CURRENT_STEP = 0
$script:LAST_PROGRESS_LENGTH = 0

function Show-Progress {
    param([string]$Message)

    $script:CURRENT_STEP++
    $percentage = [math]::Round(($script:CURRENT_STEP / $script:TOTAL_STEPS) * 100)
    
    # Create progress bar using block characters
    $barLength = 20
    $filled = [math]::Floor($barLength * $script:CURRENT_STEP / $script:TOTAL_STEPS)
    $empty = $barLength - $filled
    $bar = ([char]0x2588).ToString() * $filled + ([char]0x2591).ToString() * $empty

    # Build progress text
    $progressText = "  $bar $percentage% - $Message"
    
    # Clear previous line by overwriting with spaces
    if ($script:LAST_PROGRESS_LENGTH -gt 0) {
        $clearText = " " * $script:LAST_PROGRESS_LENGTH
        Write-Host "`r$clearText" -NoNewline
    }
    
    # Write new progress
    Write-Host "`r$progressText" -NoNewline
    $script:LAST_PROGRESS_LENGTH = $progressText.Length
}

# --- 1) Check for Node.js and npm ---
Show-Progress "Checking dependencies"
Debug-Log "Checking for Node.js..." "Gray"
try {
    if ($DEBUG) {
        $nodeVersion = node --version
    } else {
        $nodeVersion = node --version 2>$null
    }
    $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
   
    if ($nodeMajorVersion -lt 20) {
        Write-Error "Node.js version 20 or higher is required. Current version: $nodeVersion"
        exit 1
    }
    Debug-Log "Found Node.js $nodeVersion" "Green"
} catch {
    Write-Host "Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check for npm
try {
    if ($DEBUG) {
        $npmVersion = npm --version
    } else {
        $npmVersion = npm --version 2>$null
    }
    Debug-Log "Found npm $npmVersion" "Green"
} catch {
    Write-Host "npm is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# --- 2) Variables ---
$PRODUCT_SLUG = "blackbox-cli-v2"
$EXTENSION_SERVICE_URL = if ($env:EXTENSION_SERVICE_URL) { $env:EXTENSION_SERVICE_URL } else { "https://releases.blackbox.ai" }
$NPM_REGISTRY = if ($env:BLACKBOX_NPM_REGISTRY) { $env:BLACKBOX_NPM_REGISTRY } else { "https://registry.npmjs.org" }

if (-not $env:BLACKBOX_INSTALL_DIR) {
    $env:BLACKBOX_INSTALL_DIR = Join-Path $env:USERPROFILE ".blackbox-cli-v2"
}
$env:BLACKBOX_INSTALL_DIR = $env:BLACKBOX_INSTALL_DIR.Trim()

if (-not $env:BLACKBOX_BIN_DIR) {
    $env:BLACKBOX_BIN_DIR = Join-Path $env:USERPROFILE ".local\bin"
}
$env:BLACKBOX_BIN_DIR = $env:BLACKBOX_BIN_DIR.Trim()

# --- 3) Detect Architecture ---
$ARCH = $env:PROCESSOR_ARCHITECTURE
if ($ARCH -eq "AMD64") {
    $PLATFORM = "windows-x64"
} else {
    Write-Error "Unsupported architecture '$ARCH'."
    exit 1
}

# --- 4) Get latest release information ---
Show-Progress "Fetching release information"
Debug-Log "Fetching latest release information..." "Gray"
$RELEASE_API_URL = "$EXTENSION_SERVICE_URL/api/v0/latest?product=$PRODUCT_SLUG&platform=$PLATFORM"

try {
    if ($DEBUG) {
        $RELEASE_INFO = Invoke-WebRequest -Uri $RELEASE_API_URL -UseBasicParsing | ConvertFrom-Json
    } else {
        $RELEASE_INFO = Invoke-WebRequest -Uri $RELEASE_API_URL -UseBasicParsing 2>$null | ConvertFrom-Json
    }
} catch {
    Write-Error "Failed to fetch release info."
    exit 1
}

$DOWNLOAD_URL = $RELEASE_INFO.url
$VERSION = $RELEASE_INFO.version

if (-not $DOWNLOAD_URL.StartsWith("http")) {
    $DOWNLOAD_URL = "$EXTENSION_SERVICE_URL$DOWNLOAD_URL"
}

# --- 5) Download ---
Show-Progress "Downloading package"
# Use temp directory to avoid permission issues in protected directories
$TEMP_DIR = $env:TEMP
$FILENAME = Join-Path $TEMP_DIR "blackbox-cli-v2.zip"
if ($DEBUG) {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $FILENAME -UseBasicParsing
} else {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $FILENAME -UseBasicParsing 2>$null | Out-Null
}

# --- 6) Extract ---
# Note: On Windows, we cannot delete files that are currently in use (like DLLs loaded by running processes).
# We use -ErrorAction SilentlyContinue to ignore file lock errors and continue with the update.
# The extraction will overwrite existing files, so this is safe.
if (Test-Path $env:BLACKBOX_INSTALL_DIR) {
    Debug-Log "Removing existing installation at $env:BLACKBOX_INSTALL_DIR..." "DarkYellow"
    Remove-Item -Path $env:BLACKBOX_INSTALL_DIR -Recurse -Force -ErrorAction SilentlyContinue
    
    # If the directory still exists (due to locked files), that's okay - extraction will overwrite
    if (Test-Path $env:BLACKBOX_INSTALL_DIR) {
        Debug-Log "Note: Some files could not be removed (may be in use). They will be overwritten during extraction." "Gray"
    }
}
# Remove old blackbox executables from bin directory
if (Test-Path $env:BLACKBOX_BIN_DIR) {
    Debug-Log "Removing old blackbox executables from $env:BLACKBOX_BIN_DIR..." "DarkYellow"
    Remove-Item -Path (Join-Path $env:BLACKBOX_BIN_DIR "blackbox.cmd") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $env:BLACKBOX_BIN_DIR "blackbox.mjs") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $env:BLACKBOX_BIN_DIR "blackbox") -Force -ErrorAction SilentlyContinue
}

# Remove npm-installed blackbox CLI if present
Debug-Log "Checking for npm-installed blackbox CLI..." "DarkYellow"
try {
    $npmList = npm list -g @blackbox_ai/blackbox-cli 2>$null
    if ($LASTEXITCODE -eq 0) {
        Debug-Log "Removing npm-installed @blackbox_ai/blackbox-cli..." "DarkYellow"
        if ($DEBUG) {
            npm uninstall -g @blackbox_ai/blackbox-cli
        } else {
            npm uninstall -g @blackbox_ai/blackbox-cli 2>$null | Out-Null
        }
        if ($LASTEXITCODE -eq 0) {
            Debug-Log "Successfully removed npm-installed blackbox CLI." "Green"
        } else {
            Debug-Log "Warning: Failed to remove npm-installed blackbox CLI." "Yellow"
        }
    } else {
        Debug-Log "No npm-installed blackbox CLI found." "Gray"
    }
} catch {
    Debug-Log "Warning: Could not check for npm-installed blackbox CLI. $($_.Exception.Message)" "Yellow"
}

# --- 7) Create installation directory and extract ---
Show-Progress "Extracting package"
Debug-Log "Creating installation directory: $env:BLACKBOX_INSTALL_DIR" "DarkYellow"
New-Item -ItemType Directory -Path $env:BLACKBOX_INSTALL_DIR -Force | Out-Null
if ($DEBUG) {
    Expand-Archive -Path $FILENAME -DestinationPath $env:BLACKBOX_INSTALL_DIR -Force
} else {
    Expand-Archive -Path $FILENAME -DestinationPath $env:BLACKBOX_INSTALL_DIR -Force 2>$null | Out-Null
}
Remove-Item -Path $FILENAME -Force

# --- 8) Write VERSION file ---
Debug-Log "Writing version information..." "Gray"
$VERSION_FILE = Join-Path $env:BLACKBOX_INSTALL_DIR "VERSION"
$VERSION | Out-File -FilePath $VERSION_FILE -Encoding UTF8
if (Test-Path $VERSION_FILE) {
    Debug-Log "  Version $VERSION written to $VERSION_FILE" "Gray"
} else {
    Debug-Log "  Warning: Failed to write VERSION file" "Yellow"
}

# --- 7) Patch package.json and Install Dependencies ---
$CLI_DIST = Join-Path $env:BLACKBOX_INSTALL_DIR "packages\cli\dist"
if (Test-Path (Join-Path $CLI_DIST "package.json")) {
    Debug-Log "Patching dependencies..." "Gray"
    $PKG_PATH = Join-Path $CLI_DIST "package.json"
    $pkg = Get-Content $PKG_PATH | ConvertFrom-Json
    
    # Fix paths
    if ($pkg.dependencies.'@blackbox_ai/blackbox-cli-core') { $pkg.dependencies.'@blackbox_ai/blackbox-cli-core' = "file:../../core" }
    if ($pkg.devDependencies.'@blackbox_ai/blackbox-cli-test-utils') { $pkg.devDependencies.'@blackbox_ai/blackbox-cli-test-utils' = "file:../../test-utils" }
    
    # Add missing deps
    $deps = @{
        "mnemonist" = "^0.40.3"; "express" = "^4.21.2"; "openai" = "5.11.0"; "ajv" = "^8.17.1";
        "ajv-formats" = "^3.0.0"; "chardet" = "^2.1.0"; "fast-uri" = "^3.0.6"; "fastest-levenshtein" = "^1.0.16";
        "fdir" = "^6.4.6"; "form-data" = "^4.0.4"; "html-to-text" = "^9.0.5"; "https-proxy-agent" = "^7.0.6";
        "ignore" = "^7.0.0"; "jose" = "^5.10.0"; "jsonrepair" = "^3.13.0"; "marked" = "^15.0.12";
        "playwright" = "^1.56.0"; "sharp" = "^0.33.5"; "tiktoken" = "^1.0.21"; "uuid" = "^9.0.1";
        "ws" = "^8.18.0"; "exceljs" = "^4.4.0"; "mammoth" = "^1.8.0"; "yaml" = "^2.6.1";
        "picomatch" = "^4.0.1"; "glob" = "^10.4.5"; "react" = "^19.1.0"; "react-dom" = "^19.1.0";
        "undici" = "^7.10.0"; "@lvce-editor/ripgrep" = "^1.6.0"; "@xterm/headless" = "5.5.0";
        "@opentelemetry/api" = "^1.9.0"; "@opentelemetry/api-logs" = "^0.208.0"; "@opentelemetry/core" = "^2.2.0";
        "@opentelemetry/exporter-logs-otlp-grpc" = "^0.208.0"; "@opentelemetry/exporter-logs-otlp-http" = "^0.208.0";
        "@opentelemetry/exporter-metrics-otlp-grpc" = "^0.208.0"; "@opentelemetry/exporter-metrics-otlp-http" = "^0.208.0";
        "@opentelemetry/exporter-trace-otlp-grpc" = "^0.208.0"; "@opentelemetry/exporter-trace-otlp-http" = "^0.208.0";
        "@opentelemetry/instrumentation-http" = "^0.208.0"; "@opentelemetry/otlp-exporter-base" = "^0.208.0";
        "@opentelemetry/resources" = "^2.2.0"; "@opentelemetry/sdk-logs" = "^0.208.0";
        "@opentelemetry/sdk-metrics" = "^2.2.0"; "@opentelemetry/sdk-node" = "^0.208.0";
        "@opentelemetry/sdk-trace-base" = "^2.2.0"; "@opentelemetry/sdk-trace-node" = "^2.2.0";
        "@opentelemetry/semantic-conventions" = "^1.38.0"; "pg" = "^8.13.1"; "mongodb" = "^6.12.0";
        "redis" = "^4.7.0"; "mysql2" = "^3.11.5"; "@amplitude/analytics-node" = "^1.3.0"
    }

    foreach ($d in $deps.Keys) {
        if (-not $pkg.dependencies) { $pkg | Add-Member -MemberType NoteProperty -Name "dependencies" -Value (New-Object PSObject) }
        if (-not $pkg.dependencies.PSObject.Properties[$d]) {
            $pkg.dependencies | Add-Member -MemberType NoteProperty -Name $d -Value $deps[$d]
        } else {
            # Update existing dependency version
            $pkg.dependencies.$d = $deps[$d]
        }
    }
    
    $pkg | ConvertTo-Json -Depth 10 | Set-Content $PKG_PATH
    
    Show-Progress "Installing dependencies"
    Push-Location $CLI_DIST
    if (Test-Path "node_modules") { 
        Debug-Log "Removing old node_modules..." "Gray"
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue 
    }
    
    # Determine which npm command to use for better performance
    $npmCmd = "npm install"
    if (Test-Path "package-lock.json") {
        # Use npm ci if package-lock.json exists (faster and more reliable)
        $npmCmd = "npm ci"
        Debug-Log "Using npm ci (package-lock.json found)" "Gray"
    } else {
        Debug-Log "Using npm install (no package-lock.json)" "Gray"
    }
    
    # Add performance optimization flags
    $npmFlags = "--omit=dev --no-audit --no-fund --prefer-offline --legacy-peer-deps --registry=$NPM_REGISTRY"
    
    if ($DEBUG) {
        Invoke-Expression "$npmCmd $npmFlags"
    } else {
        Invoke-Expression "$npmCmd $npmFlags --silent --no-progress" 2>&1 | Out-Null
    }
    
    # Create scoped package symlinks for @blackbox_ai packages
    $SCOPE_DIR = Join-Path $CLI_DIST "node_modules\@blackbox_ai"
    if (-not (Test-Path $SCOPE_DIR)) {
        New-Item -ItemType Directory -Path $SCOPE_DIR -Force | Out-Null
    }
    
    # First, create package.json files and node_modules symlinks for core, test-utils, and vscode-ide-companion packages
    # so they can resolve dependencies from CLI's node_modules
    $CLI_NODE_MODULES = Join-Path $CLI_DIST "node_modules"
    $PKG_MAP = @{ "cli" = "blackbox-cli"; "core" = "blackbox-cli-core"; "test-utils" = "blackbox-cli-test-utils"; "vscode-ide-companion" = "blackbox-cli-vscode-ide-companion" }
    
    foreach ($p in @("core", "test-utils", "vscode-ide-companion")) {
        $PKG_ROOT = Join-Path $env:BLACKBOX_INSTALL_DIR "packages\$p"
        $PKG_DIST = Join-Path $PKG_ROOT "dist"
        
        # Create package.json for dist if missing
        if ((Test-Path $PKG_DIST) -and (-not (Test-Path (Join-Path $PKG_DIST "package.json")))) {
            $json = @{ name = "@blackbox_ai/" + $PKG_MAP[$p]; version = $VERSION; type = "module"; main = "index.js" } | ConvertTo-Json
            Set-Content -Path (Join-Path $PKG_DIST "package.json") -Value $json -Encoding UTF8
        }
        
        foreach ($dir in @($PKG_ROOT, $PKG_DIST)) {
            if (Test-Path $dir) {
                $NM = Join-Path $dir "node_modules"
                if (Test-Path $NM) { Remove-Item -Path $NM -Recurse -Force -ErrorAction SilentlyContinue }
                try {
                    if ($DEBUG) {
                        New-Item -ItemType SymbolicLink -Path $NM -Target $CLI_NODE_MODULES -Force -ErrorAction Stop | Out-Null
                    } else {
                        New-Item -ItemType SymbolicLink -Path $NM -Target $CLI_NODE_MODULES -Force -ErrorAction Stop 2>$null | Out-Null
                    }
                } catch {
                    try {
                        cmd /c mklink /J "$NM" "$CLI_NODE_MODULES" 2>&1 | Out-Null
                    } catch {}
                }
            }
        }
    }
    
    # Link core package
    $coreTarget = Join-Path $env:BLACKBOX_INSTALL_DIR "packages\core\dist"
    $coreLinkPath = Join-Path $SCOPE_DIR "blackbox-cli-core"
    if (Test-Path $coreTarget) {
        if (Test-Path $coreLinkPath) {
            Remove-Item -Path $coreLinkPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        try {
            if ($DEBUG) {
                New-Item -ItemType SymbolicLink -Path $coreLinkPath -Target $coreTarget -Force -ErrorAction Stop | Out-Null
            } else {
                New-Item -ItemType SymbolicLink -Path $coreLinkPath -Target $coreTarget -Force -ErrorAction Stop 2>$null | Out-Null
            }
        } catch {
            try {
                cmd /c mklink /J "$coreLinkPath" "$coreTarget" 2>&1 | Out-Null
            } catch {}
        }
    }
    
    # Link test-utils package
    $testUtilsTarget = Join-Path $env:BLACKBOX_INSTALL_DIR "packages\test-utils\dist"
    $testUtilsLinkPath = Join-Path $SCOPE_DIR "blackbox-cli-test-utils"
    if (Test-Path $testUtilsTarget) {
        if (Test-Path $testUtilsLinkPath) {
            Remove-Item -Path $testUtilsLinkPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        try {
            if ($DEBUG) {
                New-Item -ItemType SymbolicLink -Path $testUtilsLinkPath -Target $testUtilsTarget -Force -ErrorAction Stop | Out-Null
            } else {
                New-Item -ItemType SymbolicLink -Path $testUtilsLinkPath -Target $testUtilsTarget -Force -ErrorAction Stop 2>$null | Out-Null
            }
        } catch {
            try {
                cmd /c mklink /J "$testUtilsLinkPath" "$testUtilsTarget" 2>&1 | Out-Null
            } catch {}
        }
    }
    
    # Link vscode-ide-companion package
    $vscodeTarget = Join-Path $env:BLACKBOX_INSTALL_DIR "packages\vscode-ide-companion\dist"
    $vscodeLinkPath = Join-Path $SCOPE_DIR "blackbox-cli-vscode-ide-companion"
    if (Test-Path $vscodeTarget) {
        if (Test-Path $vscodeLinkPath) {
            Remove-Item -Path $vscodeLinkPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        try {
            if ($DEBUG) {
                New-Item -ItemType SymbolicLink -Path $vscodeLinkPath -Target $vscodeTarget -Force -ErrorAction Stop | Out-Null
            } else {
                New-Item -ItemType SymbolicLink -Path $vscodeLinkPath -Target $vscodeTarget -Force -ErrorAction Stop 2>$null | Out-Null
            }
        } catch {
            try {
                cmd /c mklink /J "$vscodeLinkPath" "$vscodeTarget" 2>&1 | Out-Null
            } catch {}
        }
    }
    
    Pop-Location
}

# --- 8) Setup Local Packages ---
Show-Progress "Ensuring requirements"
Debug-Log "Setting up package resolution..." "Gray"
$PKG_MAP = @{ "cli" = "blackbox-cli"; "core" = "blackbox-cli-core"; "test-utils" = "blackbox-cli-test-utils"; "vscode-ide-companion" = "blackbox-cli-vscode-ide-companion" }

foreach ($p in @("core", "test-utils", "vscode-ide-companion")) {
    $PKG_ROOT = Join-Path $env:BLACKBOX_INSTALL_DIR "packages\$p"
    $PKG_DIST = Join-Path $PKG_ROOT "dist"
    
    # Create package.json for core/dist etc if missing
    if ((Test-Path $PKG_DIST) -and (-not (Test-Path (Join-Path $PKG_DIST "package.json")))) {
        $json = @{ name = "@blackbox_ai/" + $PKG_MAP[$p]; version = $VERSION; type = "module"; main = "index.js" } | ConvertTo-Json
        Set-Content -Path (Join-Path $PKG_DIST "package.json") -Value $json -Encoding UTF8
    }
    
    # Link package node_modules to CLI node_modules
    foreach ($dir in @($PKG_ROOT, $PKG_DIST)) {
        if (Test-Path $dir) {
            $NM = Join-Path $dir "node_modules"
            if (Test-Path $NM) { Remove-Item -Path $NM -Recurse -Force -ErrorAction SilentlyContinue }
            try { 
                if ($DEBUG) {
                    New-Item -ItemType SymbolicLink -Path $NM -Target (Join-Path $CLI_DIST "node_modules") -Force -ErrorAction Stop | Out-Null
                } else {
                    New-Item -ItemType SymbolicLink -Path $NM -Target (Join-Path $CLI_DIST "node_modules") -Force -ErrorAction Stop 2>$null | Out-Null
                }
            }
            catch { 
                try { 
                    if ($DEBUG) {
                        cmd /c mklink /J "$NM" "$(Join-Path $CLI_DIST "node_modules")" 2>&1 | Out-Null
                    } else {
                        cmd /c mklink /J "$NM" "$(Join-Path $CLI_DIST "node_modules")" 2>&1 | Out-Null
                    }
                } catch {} 
            }
        }
    }
}

# --- 9) Setup Bin ---
Show-Progress "Creating executable wrapper"
if (-not (Test-Path $env:BLACKBOX_BIN_DIR)) { New-Item -ItemType Directory -Path $env:BLACKBOX_BIN_DIR -Force | Out-Null }
$WRAPPER_CMD = Join-Path $env:BLACKBOX_BIN_DIR "blackbox.cmd"
$WRAPPER_MJS = Join-Path $env:BLACKBOX_BIN_DIR "blackbox.mjs"

$cmdContent = "@echo off`r`nsetlocal`r`nset `"BLACKBOX_INSTALL_DIR=" + $env:BLACKBOX_INSTALL_DIR + "`"`r`nset `"BLACKBOX_CLI_V2_ROOT=%BLACKBOX_INSTALL_DIR%`"`r`nnode `"%~dp0blackbox.mjs`" %*"
Set-Content -Path $WRAPPER_CMD -Value $cmdContent -Encoding ASCII

$mjsLines = @(
    '#!/usr/bin/env node', 'import { pathToFileURL } from "url";', 'import { join } from "path";', 'import { existsSync } from "fs";',
    'const installDir = process.env.BLACKBOX_INSTALL_DIR || join(process.env.USERPROFILE || process.env.HOME, ".blackbox-cli-v2");',
    'const cliEntry = join(installDir, "packages", "cli", "dist", "index.js");',
    'if (!existsSync(cliEntry)) { console.error("Not found"); process.exit(1); }',
    'process.env.BLACKBOX_CLI_V2_ROOT = installDir;',
    'try { await import(pathToFileURL(cliEntry).href); } catch (e) { console.error(e.message); process.exit(1); }'
)
Set-Content -Path $WRAPPER_MJS -Value ($mjsLines -join "`n") -Encoding UTF8

# --- 13) Check PATH and add to environment if needed ---
Show-Progress "Configuring PATH"
$CURRENT_PATH = $env:PATH
Debug-Log ""
Debug-Log "Ensuring $env:BLACKBOX_BIN_DIR is at the top of your PATH (highest priority)..." "Green"

try {
    # Get current user PATH
    $currentUserPath = [Environment]::GetEnvironmentVariable('PATH', 'User')

    # Remove the bin directory from user PATH if it exists anywhere
    if ($currentUserPath -like "*$env:BLACKBOX_BIN_DIR*") {
        $pathEntries = $currentUserPath -split ';' | Where-Object { $_ -and $_ -ne $env:BLACKBOX_BIN_DIR }
        $currentUserPath = $pathEntries -join ';'
    }

    # Prepend to user PATH (highest priority)
    $newUserPath = "$env:BLACKBOX_BIN_DIR;$currentUserPath"
    [Environment]::SetEnvironmentVariable('PATH', $newUserPath, 'User')

    # Add BLACKBOX_INSTALL_DIR to user environment
    [Environment]::SetEnvironmentVariable('BLACKBOX_INSTALL_DIR', $env:BLACKBOX_INSTALL_DIR, 'User')

    # Remove from current session PATH if present, then prepend (highest priority)
    $sessionPathEntries = $env:PATH -split ';' | Where-Object { $_ -and $_ -ne $env:BLACKBOX_BIN_DIR }
    $env:PATH = "$env:BLACKBOX_BIN_DIR;" + ($sessionPathEntries -join ';')

    Debug-Log "PATH successfully updated!" "Green"
    Debug-Log "- Updated user environment variables" "Green"
    Debug-Log "- Updated current session PATH" "Green"
    Debug-Log ""
} catch {
    Write-Host "Error: Failed to update PATH automatically. $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please add manually using one of these methods:" -ForegroundColor DarkYellow
    Write-Host "For user PATH (no admin required):" -ForegroundColor DarkYellow
    Write-Host "    `$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')" -ForegroundColor Cyan
    Write-Host "    `$userPath = `$userPath -replace ';$env:BLACKBOX_BIN_DIR', '' -replace '$env:BLACKBOX_BIN_DIR;', ''" -ForegroundColor Cyan
    Write-Host "    [Environment]::SetEnvironmentVariable('PATH', '$env:BLACKBOX_BIN_DIR;' + `$userPath, 'User')" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "For this session only:" -ForegroundColor DarkYellow
    Write-Host "    `$env:PATH = '$env:BLACKBOX_BIN_DIR;' + (`$env:PATH -split ';' | Where-Object { `$_ -ne '$env:BLACKBOX_BIN_DIR' }) -join ';'" -ForegroundColor Cyan
}

Show-Progress "Installation complete"
Write-Host ""
Log "Blackbox CLI v2 version $VERSION installed successfully!" "Green"
Debug-Log ""
Debug-Log "[OK] Installed successfully! Please run 'blackbox' to get started." "Green"

# --- 14) Auto-restart if triggered by CLI update ---
$AUTO_RESTART = $env:AUTO_RESTART -eq "true"
$RESUME_CHECKPOINT = $env:RESUME_CHECKPOINT

if ($AUTO_RESTART) {
    Debug-Log "" "Gray"
    Debug-Log "Auto-restart enabled, restarting Blackbox CLI..." "Gray"
    
    # Ensure bin directory is in PATH for this session
    if ($env:PATH -notlike "*$env:BLACKBOX_BIN_DIR*") {
        $env:PATH = "$env:BLACKBOX_BIN_DIR;$env:PATH"
    }
    
    # Wait a moment for file system to settle
    Start-Sleep -Milliseconds 1000
    
    # Restart the CLI with proper console attachment
    # Start-Process with -NoNewWindow ensures the CLI runs in the same console window
    # This preserves the TTY connection for interactive mode
    if ($RESUME_CHECKPOINT -and $RESUME_CHECKPOINT.Trim()) {
        Debug-Log "Restarting with checkpoint: $RESUME_CHECKPOINT" "Gray"
        Start-Process -FilePath $WRAPPER_CMD -ArgumentList "--resume-checkpoint", $RESUME_CHECKPOINT -NoNewWindow -Wait
    } else {
        Debug-Log "Restarting in interactive mode" "Gray"
        Start-Process -FilePath $WRAPPER_CMD -NoNewWindow -Wait
    }
    
    # Exit after CLI completes
    exit 0
}