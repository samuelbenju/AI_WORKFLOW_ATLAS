# Run in an ordinary private PowerShell terminal, from the trusted checkout.
# No password/connection secret is accepted as an argument or saved to disk.
$ErrorActionPreference = 'Stop'
$names = @('DATABASE_URL', 'ADMIN_BOOTSTRAP_EMAIL', 'NEON_STAGING_EXPECTED_HOST')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$pointer = [IntPtr]::Zero
try {
    if ((node --version) -notmatch '^v24\.') { throw 'Se requiere Node.js 24.' }
    if (-not (Test-Path 'node_modules/.bin/tsx.cmd')) { throw 'Ejecuta npm ci --ignore-scripts y npm run db:generate primero.' }
    $env:ADMIN_BOOTSTRAP_EMAIL = Read-Host 'Correo del propietario (solo se usa en este proceso)'
    $env:NEON_STAGING_EXPECTED_HOST = Read-Host 'Host DIRECTO confirmado en el proyecto Neon staging (sin protocolo)'
    $secureConnection = Read-Host 'Conexion directa del runtime atlas_staging_app (entrada oculta)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureConnection)
    $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $pointer = [IntPtr]::Zero
    # The application OWNER password is requested twice by the existing Node
    # interactive CLI with no echo. It never enters a PowerShell command line.
    & npm.cmd run admin:init -- --staging
    if ($LASTEXITCODE -ne 0) { throw 'Inicializacion no completada; revisa el destino y las instrucciones privadas, sin compartir credenciales.' }
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    if ($secureConnection) { $secureConnection.Dispose() }
    $secureConnection = $null
}
