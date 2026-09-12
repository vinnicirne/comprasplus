Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\icons\icon-512.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source icon not found at $srcPath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Source image size: $($srcBmp.Width)x$($srcBmp.Height)"

$resDir = Join-Path $PSScriptRoot "..\android\app\src\main\res"

$densities = @(
    @{ Name = "mipmap-mdpi";    LauncherSize = 48;  FgSize = 108 },
    @{ Name = "mipmap-hdpi";    LauncherSize = 72;  FgSize = 162 },
    @{ Name = "mipmap-xhdpi";   LauncherSize = 96;  FgSize = 216 },
    @{ Name = "mipmap-xxhdpi";  LauncherSize = 144; FgSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; LauncherSize = 192; FgSize = 432 }
)

function Resize-Image {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$targetWidth,
        [int]$targetHeight,
        [double]$scaleFactor = 1.0,
        [string]$outputPath
    )

    $destBmp = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $drawW = [int]($targetWidth * $scaleFactor)
    $drawH = [int]($targetHeight * $scaleFactor)
    $drawX = [int](($targetWidth - $drawW) / 2)
    $drawY = [int](($targetHeight - $drawH) / 2)

    $destRect = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawW, $drawH
    $graphics.DrawImage($source, $destRect, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    # If file exists, remove it first
    if (Test-Path $outputPath) {
        Remove-Item $outputPath -Force
    }
    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated: $outputPath ($targetWidth x $targetHeight)"
}

foreach ($d in $densities) {
    $folder = Join-Path $resDir $d.Name
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }

    # 1. ic_launcher.png (standard icon)
    $launcherPath = Join-Path $folder "ic_launcher.png"
    Resize-Image -source $srcBmp -targetWidth $d.LauncherSize -targetHeight $d.LauncherSize -scaleFactor 1.0 -outputPath $launcherPath

    # 2. ic_launcher_round.png (round icon)
    $roundPath = Join-Path $folder "ic_launcher_round.png"
    Resize-Image -source $srcBmp -targetWidth $d.LauncherSize -targetHeight $d.LauncherSize -scaleFactor 1.0 -outputPath $roundPath

    # 3. ic_launcher_foreground.png (adaptive foreground, scaled to ~70% so safe zone fits)
    $fgPath = Join-Path $folder "ic_launcher_foreground.png"
    Resize-Image -source $srcBmp -targetWidth $d.FgSize -targetHeight $d.FgSize -scaleFactor 0.72 -outputPath $fgPath
}

# Update splash screen in drawable as well
$drawableFolder = Join-Path $resDir "drawable"
if (Test-Path $drawableFolder) {
    $splashPath = Join-Path $drawableFolder "splash.png"
    Resize-Image -source $srcBmp -targetWidth 480 -targetHeight 480 -scaleFactor 0.85 -outputPath $splashPath
}

$srcBmp.Dispose()
Write-Host "SUCCESS: All Android launcher icons and foregrounds have been updated!"
