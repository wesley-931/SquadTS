Add-Type -AssemblyName System.Drawing

function Create-RoundedRectanglePath {
    param(
        [System.Drawing.RectangleF]$rect,
        [float]$radius
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2

    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Generate-HorizontalLogo {
    param(
        [string]$outputPath,
        [System.Drawing.Color]$squadColor,
        [int]$width = 1413,
        [int]$height = 621
    )
    
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $fontFamilyName = "Segoe UI"
    $emSize = 190
    $fontFamily = New-Object System.Drawing.FontFamily($fontFamilyName)
    $fontStyle = [int][System.Drawing.FontStyle]::Bold
    
    # 1. Create SQUAD path
    $squadPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $stringFormat = [System.Drawing.StringFormat]::GenericTypographic
    $squadPath.AddString("SQUAD", $fontFamily, $fontStyle, $emSize, (New-Object System.Drawing.PointF(0, 0)), $stringFormat)
    $squadBounds = $squadPath.GetBounds()
    
    # 2. Create TS text path
    $tsPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $tsEmSize = 175
    $tsPath.AddString("TS", $fontFamily, $fontStyle, $tsEmSize, (New-Object System.Drawing.PointF(0, 0)), $stringFormat)
    $tsBounds = $tsPath.GetBounds()
    
    # Badge metrics
    $badgePaddingX = 38
    $badgePaddingY = 16
    $badgeW = $tsBounds.Width + ($badgePaddingX * 2)
    $badgeH = $squadBounds.Height + ($badgePaddingY * 2) - 10
    
    $gap = 35
    $totalW = $squadBounds.Width + $gap + $badgeW
    
    $startX = ($width - $totalW) / 2 - $squadBounds.X
    $startY = ($height - $squadBounds.Height) / 2 - $squadBounds.Y
    
    # Move SQUAD path to target position
    $matrixSquad = New-Object System.Drawing.Drawing2D.Matrix
    $matrixSquad.Translate($startX, $startY)
    $squadPath.Transform($matrixSquad)
    
    # Draw SQUAD
    $squadBrush = New-Object System.Drawing.SolidBrush($squadColor)
    $g.FillPath($squadBrush, $squadPath)
    
    # Position badge
    $badgeX = $startX + $squadBounds.Width + $squadBounds.X + $gap
    $badgeY = ($height - $badgeH) / 2
    
    $tsBlue = [System.Drawing.Color]::FromArgb(255, 49, 120, 198) # TypeScript Blue #3178C6
    $badgeBrush = New-Object System.Drawing.SolidBrush($tsBlue)
    $badgeRect = New-Object System.Drawing.RectangleF($badgeX, $badgeY, $badgeW, $badgeH)
    $badgePath = Create-RoundedRectanglePath -rect $badgeRect -radius 28
    $g.FillPath($badgeBrush, $badgePath)
    
    # Move TS path to center of badge
    $tsTargetX = $badgeX + ($badgeW - $tsBounds.Width) / 2 - $tsBounds.X
    $tsTargetY = $badgeY + ($badgeH - $tsBounds.Height) / 2 - $tsBounds.Y
    $matrixTs = New-Object System.Drawing.Drawing2D.Matrix
    $matrixTs.Translate($tsTargetX, $tsTargetY)
    $tsPath.Transform($matrixTs)
    
    $tsBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($tsBrush, $tsPath)
    
    # Clean up
    $squadBrush.Dispose()
    $badgeBrush.Dispose()
    $tsBrush.Dispose()
    $squadPath.Dispose()
    $tsPath.Dispose()
    $badgePath.Dispose()
    $matrixSquad.Dispose()
    $matrixTs.Dispose()
    $fontFamily.Dispose()
    $g.Dispose()
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $outputPath"
}

function Generate-SquareLogo {
    param(
        [string]$outputPath,
        [int]$size = 1413
    )
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $fontFamilyName = "Segoe UI"
    $fontFamily = New-Object System.Drawing.FontFamily($fontFamilyName)
    $fontStyle = [int][System.Drawing.FontStyle]::Bold
    $stringFormat = [System.Drawing.StringFormat]::GenericTypographic
    
    # SQUAD path
    $squadEmSize = 220
    $squadPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $squadPath.AddString("SQUAD", $fontFamily, $fontStyle, $squadEmSize, (New-Object System.Drawing.PointF(0, 0)), $stringFormat)
    $squadBounds = $squadPath.GetBounds()
    
    # TS path
    $tsEmSize = 210
    $tsPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $tsPath.AddString("TS", $fontFamily, $fontStyle, $tsEmSize, (New-Object System.Drawing.PointF(0, 0)), $stringFormat)
    $tsBounds = $tsPath.GetBounds()
    
    $badgeW = 500
    $badgeH = 260
    $elementGap = 70
    
    $totalContentH = $squadBounds.Height + $elementGap + $badgeH
    
    $squadTargetX = ($size - $squadBounds.Width) / 2 - $squadBounds.X
    $squadTargetY = ($size - $totalContentH) / 2 - $squadBounds.Y
    
    $matrixSquad = New-Object System.Drawing.Drawing2D.Matrix
    $matrixSquad.Translate($squadTargetX, $squadTargetY)
    $squadPath.Transform($matrixSquad)
    
    # Draw SQUAD white
    $squadBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($squadBrush, $squadPath)
    
    # Badge
    $badgeX = ($size - $badgeW) / 2
    $badgeY = ($size - $totalContentH) / 2 + $squadBounds.Height + $elementGap
    
    $tsBlue = [System.Drawing.Color]::FromArgb(255, 49, 120, 198)
    $badgeBrush = New-Object System.Drawing.SolidBrush($tsBlue)
    $badgeRect = New-Object System.Drawing.RectangleF($badgeX, $badgeY, $badgeW, $badgeH)
    $badgePath = Create-RoundedRectanglePath -rect $badgeRect -radius 40
    $g.FillPath($badgeBrush, $badgePath)
    
    # Draw TS white inside badge
    $tsTargetX = $badgeX + ($badgeW - $tsBounds.Width) / 2 - $tsBounds.X
    $tsTargetY = $badgeY + ($badgeH - $tsBounds.Height) / 2 - $tsBounds.Y
    $matrixTs = New-Object System.Drawing.Drawing2D.Matrix
    $matrixTs.Translate($tsTargetX, $tsTargetY)
    $tsPath.Transform($matrixTs)
    
    $tsBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($tsBrush, $tsPath)
    
    # Clean up
    $squadBrush.Dispose()
    $badgeBrush.Dispose()
    $tsBrush.Dispose()
    $squadPath.Dispose()
    $tsPath.Dispose()
    $badgePath.Dispose()
    $matrixSquad.Dispose()
    $matrixTs.Dispose()
    $fontFamily.Dispose()
    $g.Dispose()
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $outputPath"
}

# Colors
$darkColor = [System.Drawing.Color]::FromArgb(255, 18, 22, 28)
$whiteColor = [System.Drawing.Color]::White

Generate-HorizontalLogo -outputPath "assets/squadts-logo.png" -squadColor $darkColor
Generate-HorizontalLogo -outputPath "assets/squadts-logo-white.png" -squadColor $whiteColor
Generate-SquareLogo -outputPath "assets/squadts-logo-square-white.png"
