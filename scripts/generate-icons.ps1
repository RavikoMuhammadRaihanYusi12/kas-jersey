Add-Type -AssemblyName System.Drawing

# --- helpers ---------------------------------------------------------------

function New-Canvas {
  param([int]$Size, [System.Drawing.Color]$Fill)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($Fill)
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Save-Bitmap {
  param($Bmp, [string]$Dest)
  $Bmp.Save((Join-Path (Get-Location) $Dest), [System.Drawing.Imaging.ImageFormat]::Png)
  $Bmp.Dispose()
}

<#
  Loads K3.png and drops its white background, keeping only the dark ink.
  The adaptive-icon foreground must be transparent or Android renders it as a square.
#>
function Get-LogoTransparent {
  param([string]$Src, [int]$Threshold = 235)
  [System.Drawing.Image]$img = [System.Drawing.Image]::FromFile((Resolve-Path $Src).Path)
  $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage([System.Drawing.Image]$img, 0, 0, $img.Width, $img.Height)
  $g.Dispose()
  $img.Dispose()

  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $p = $bmp.GetPixel($x, $y)
      # Ink coverage = how dark the pixel is. White background -> alpha 0,
      # black ink -> alpha 255, anti-aliased edges keep a smooth ramp.
      $dark = 255 - [Math]::Max($p.R, [Math]::Max($p.G, $p.B))
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($dark, 0, 0, 0))
    }
  }
  return $bmp
}

# --- 1. App icon: white square, logo fills most of it ----------------------

$logo = Get-LogoTransparent -Src "assets\K3.png"

$c = New-Canvas -Size 1024 -Fill ([System.Drawing.Color]::White)
$c.Graphics.DrawImage([System.Drawing.Image]$logo, 62, 62, 900, 900)
$c.Graphics.Dispose()
Save-Bitmap -Bmp $c.Bitmap -Dest "assets\icon.png"

# --- 2. Adaptive icon foreground: transparent, logo inside the safe zone ---

$c = New-Canvas -Size 512 -Fill ([System.Drawing.Color]::Transparent)
$c.Graphics.DrawImage([System.Drawing.Image]$logo, 66, 66, 380, 380)
$c.Graphics.Dispose()
Save-Bitmap -Bmp $c.Bitmap -Dest "assets\android-icon-foreground.png"

# Monochrome icon uses the same transparent silhouette; Android tints it.
$c = New-Canvas -Size 512 -Fill ([System.Drawing.Color]::Transparent)
$c.Graphics.DrawImage([System.Drawing.Image]$logo, 66, 66, 380, 380)
$c.Graphics.Dispose()
Save-Bitmap -Bmp $c.Bitmap -Dest "assets\android-icon-monochrome.png"

# --- 3. Adaptive icon background: solid white -------------------------------

$c = New-Canvas -Size 512 -Fill ([System.Drawing.Color]::White)
$c.Graphics.Dispose()
Save-Bitmap -Bmp $c.Bitmap -Dest "assets\android-icon-background.png"

# --- 4. Splash + favicon ----------------------------------------------------

$c = New-Canvas -Size 512 -Fill ([System.Drawing.Color]::Transparent)
$c.Graphics.DrawImage([System.Drawing.Image]$logo, 56, 56, 400, 400)
$c.Graphics.Dispose()
Save-Bitmap -Bmp $c.Bitmap -Dest "assets\splash-icon.png"

$c = New-Canvas -Size 64 -Fill ([System.Drawing.Color]::White)
$c.Graphics.DrawImage([System.Drawing.Image]$logo, 4, 4, 56, 56)
$c.Graphics.Dispose()
Save-Bitmap -Bmp $c.Bitmap -Dest "assets\favicon.png"

$logo.Dispose()

Get-ChildItem "assets" -Filter "*.png" | Select-Object Name, Length
