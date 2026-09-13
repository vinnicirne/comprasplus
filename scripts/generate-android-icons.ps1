Add-Type -AssemblyName System.Drawing

$srcIcon512 = Join-Path $PSScriptRoot "..\icons\icon-512.png"
$srcIconMaskable = Join-Path $PSScriptRoot "..\icons\icon-maskable.png"

if (-not (Test-Path $srcIcon512)) {
    Write-Error "Source icon not found at $srcIcon512"
    exit 1
}

$bmp512 = [System.Drawing.Bitmap]::FromFile($srcIcon512)
$bmpMaskable = [System.Drawing.Bitmap]::FromFile($srcIconMaskable)

$targetDirs = @(
    (Join-Path $PSScriptRoot "..\android\app\src\main\res"),
    (Join-Path $PSScriptRoot "..\resources\android\res")
)

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

    if (Test-Path $outputPath) {
        Remove-Item $outputPath -Force
    }
    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated: $outputPath ($targetWidth x $targetHeight)"
}

foreach ($resDir in $targetDirs) {
    if (-not (Test-Path $resDir)) {
        New-Item -ItemType Directory -Path $resDir -Force | Out-Null
    }

    foreach ($d in $densities) {
        $folder = Join-Path $resDir $d.Name
        if (-not (Test-Path $folder)) {
            New-Item -ItemType Directory -Path $folder -Force | Out-Null
        }

        # 1. ic_launcher.png (standard icon from icon-512)
        $launcherPath = Join-Path $folder "ic_launcher.png"
        Resize-Image -source $bmp512 -targetWidth $d.LauncherSize -targetHeight $d.LauncherSize -scaleFactor 1.0 -outputPath $launcherPath

        # 2. ic_launcher_round.png (round icon from icon-512)
        $roundPath = Join-Path $folder "ic_launcher_round.png"
        Resize-Image -source $bmp512 -targetWidth $d.LauncherSize -targetHeight $d.LauncherSize -scaleFactor 1.0 -outputPath $roundPath

        # 3. ic_launcher_foreground.png (adaptive foreground from icon-maskable: full bleed blue gradient)
        $fgPath = Join-Path $folder "ic_launcher_foreground.png"
        Resize-Image -source $bmpMaskable -targetWidth $d.FgSize -targetHeight $d.FgSize -scaleFactor 1.0 -outputPath $fgPath
    }

    # Splash screen in drawable
    $drawableFolder = Join-Path $resDir "drawable"
    if (-not (Test-Path $drawableFolder)) {
        New-Item -ItemType Directory -Path $drawableFolder -Force | Out-Null
    }
    $splashPath = Join-Path $drawableFolder "splash.png"
    Resize-Image -source $bmp512 -targetWidth 480 -targetHeight 480 -scaleFactor 0.90 -outputPath $splashPath
}

$bmp512.Dispose()
$bmpMaskable.Dispose()

Write-Host "SUCCESS: All Android launcher icons and foregrounds have been updated in both android/ and resources/!"
