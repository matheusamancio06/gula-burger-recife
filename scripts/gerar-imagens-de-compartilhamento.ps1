# Gera de novo a imagem de prévia de compartilhamento (public/images/share.jpg, 1200x630) e os ícones PNG
# (public/favicon-48.png e public/apple-touch-icon.png) a partir da foto da hero e do logo.
# Uso (Windows, na pasta do projeto):  powershell -File scripts/gerar-imagens-de-compartilhamento.ps1
param([string]$Root = (Split-Path -Parent $PSScriptRoot))
Add-Type -AssemblyName System.Drawing

function Save-Jpeg($bitmap, $path, [long]$quality) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
  $bitmap.Save($path, $codec, $params)
}

function New-Canvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @($bmp, $g)
}

$hero = [System.Drawing.Image]::FromFile((Join-Path $Root 'public/images/hero-bg.jpg'))
$logo = [System.Drawing.Image]::FromFile((Join-Path $Root 'public/brand/gula-burger-logo.jpg'))

# --- Imagem de prévia 1200x630 (proporção 1,91:1): recorte central da foto da hero + logo no canto ---
$cropH = [int][Math]::Round($hero.Width * 630 / 1200)          # 722
$cropY = [int][Math]::Round(($hero.Height - $cropH) / 2)
$bmp, $g = New-Canvas 1200 630
$g.DrawImage($hero, (New-Object System.Drawing.Rectangle(0, 0, 1200, 630)), (New-Object System.Drawing.Rectangle(0, $cropY, $hero.Width, $cropH)), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($logo, (New-Object System.Drawing.Rectangle(48, 48, 132, 132)))
$g.Dispose()
Save-Jpeg $bmp (Join-Path $Root 'public/images/share.jpg') 84
$bmp.Dispose()

# --- Ícones PNG a partir do logo (Google pede favicon em múltiplos de 48 px) ---
foreach ($size in 48, 180) {
  $icon, $gi = New-Canvas $size $size
  $gi.DrawImage($logo, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
  $gi.Dispose()
  $name = if ($size -eq 180) { 'apple-touch-icon.png' } else { "favicon-$size.png" }
  $icon.Save((Join-Path $Root "public/$name"), [System.Drawing.Imaging.ImageFormat]::Png)
  $icon.Dispose()
}
$hero.Dispose(); $logo.Dispose()
Get-ChildItem (Join-Path $Root 'public') -File | Select-Object Name, Length | Format-Table -AutoSize | Out-String
Get-Item (Join-Path $Root 'public/images/share.jpg') | Select-Object Name, Length | Format-Table -AutoSize | Out-String
