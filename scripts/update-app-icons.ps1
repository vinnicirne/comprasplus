Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\admin\.gemini\antigravity-ide\brain\d0399517-5837-490a-ba31-6989725e16c2\.user_uploaded\media_1789341622119.jpg"
$rootDir = (Resolve-Path "$PSScriptRoot\..").Path

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source icon not found at $sourcePath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
Write-Host "Source image loaded: $($srcBmp.Width) x $($srcBmp.Height)"

function Resize-And-Save {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [double]$scaleFactor = 1.0,
        [string]$outputPath
    )

    $parentDir = Split-Path $outputPath -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $drawW = [int]($width * $scaleFactor)
    $drawH = [int]($height * $scaleFactor)
    $drawX = [int](($width - $drawW) / 2)
    $drawY = [int](($height - $drawH) / 2)

    $destRect = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawW, $drawH
    $graphics.DrawImage($source, $destRect, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    if (Test-Path $outputPath) {
        Remove-Item $outputPath -Force
    }
    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Saved: $outputPath ($width x $height)"
}

# 1. Atualiza pasta icons/
$iconsDir = Join-Path $rootDir "icons"
Resize-And-Save -source $srcBmp -width 512 -height 512 -scaleFactor 1.0 -outputPath (Join-Path $iconsDir "icon-512.png")
Resize-And-Save -source $srcBmp -width 512 -height 512 -scaleFactor 1.0 -outputPath (Join-Path $iconsDir "icon-maskable.png")
Resize-And-Save -source $srcBmp -width 512 -height 512 -scaleFactor 1.0 -outputPath (Join-Path $iconsDir "app-icon.png")
Resize-And-Save -source $srcBmp -width 192 -height 192 -scaleFactor 1.0 -outputPath (Join-Path $iconsDir "icon-192.png")
Resize-And-Save -source $srcBmp -width 64 -height 64 -scaleFactor 1.0 -outputPath (Join-Path $iconsDir "favicon.png")

# 2. Atualiza pasta public/icons/ para servir no PWA/Web
$publicIconsDir = Join-Path $rootDir "public\icons"
Resize-And-Save -source $srcBmp -width 512 -height 512 -scaleFactor 1.0 -outputPath (Join-Path $publicIconsDir "icon-512.png")
Resize-And-Save -source $srcBmp -width 512 -height 512 -scaleFactor 1.0 -outputPath (Join-Path $publicIconsDir "icon-maskable.png")
Resize-And-Save -source $srcBmp -width 512 -height 512 -scaleFactor 1.0 -outputPath (Join-Path $publicIconsDir "app-icon.png")
Resize-And-Save -source $srcBmp -width 192 -height 192 -scaleFactor 1.0 -outputPath (Join-Path $publicIconsDir "icon-192.png")
Resize-And-Save -source $srcBmp -width 64 -height 64 -scaleFactor 1.0 -outputPath (Join-Path $publicIconsDir "favicon.png")

# 3. Atualiza Android Res em resources/android/res e android/app/src/main/res
$androidDirs = @(
    (Join-Path $rootDir "resources\android\res"),
    (Join-Path $rootDir "android\app\src\main\res")
)

$densities = @(
    @{ Name = "mipmap-mdpi";    LauncherSize = 48;  FgSize = 108 },
    @{ Name = "mipmap-hdpi";    LauncherSize = 72;  FgSize = 162 },
    @{ Name = "mipmap-xhdpi";   LauncherSize = 96;  FgSize = 216 },
    @{ Name = "mipmap-xxhdpi";  LauncherSize = 144; FgSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; LauncherSize = 192; FgSize = 432 }
)

foreach ($resDir in $androidDirs) {
    if (-not (Test-Path $resDir)) {
        New-Item -ItemType Directory -Path $resDir -Force | Out-Null
    }

    foreach ($d in $densities) {
        $folder = Join-Path $resDir $d.Name
        if (-not (Test-Path $folder)) {
            New-Item -ItemType Directory -Path $folder -Force | Out-Null
        }

        # ic_launcher.png
        $launcherPath = Join-Path $folder "ic_launcher.png"
        Resize-And-Save -source $srcBmp -width $d.LauncherSize -height $d.LauncherSize -scaleFactor 1.0 -outputPath $launcherPath

        # ic_launcher_round.png
        $roundPath = Join-Path $folder "ic_launcher_round.png"
        Resize-And-Save -source $srcBmp -width $d.LauncherSize -height $d.LauncherSize -scaleFactor 1.0 -outputPath $roundPath

        # ic_launcher_foreground.png (para adaptive icon com respiro adequado)
        $fgPath = Join-Path $folder "ic_launcher_foreground.png"
        Resize-And-Save -source $srcBmp -width $d.FgSize -height $d.FgSize -scaleFactor 0.75 -outputPath $fgPath
    }

    # Splash screen
    $drawableFolder = Join-Path $resDir "drawable"
    if (-not (Test-Path $drawableFolder)) {
        New-Item -ItemType Directory -Path $drawableFolder -Force | Out-Null
    }
    $splashPath = Join-Path $drawableFolder "splash.png"
    Resize-And-Save -source $srcBmp -width 480 -height 480 -scaleFactor 0.85 -outputPath $splashPath

    # Atualiza background do icone adaptativo com a cor oficial verde #059669
    $bgValFile = Join-Path $resDir "values\ic_launcher_background.xml"
    $valContent = "<?xml version=""1.0"" encoding=""utf-8""?>`n<resources>`n    <color name=""ic_launcher_background"">#059669</color>`n</resources>`n"
    Set-Content -Path $bgValFile -Value $valContent -Encoding UTF8
    Write-Host "Updated ic_launcher_background color to #059669 in $bgValFile"
}

$srcBmp.Dispose()
Write-Host "SUCCESS: Todos os icones foram gerados e atualizados no Android e Web/PWA!"
