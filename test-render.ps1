$apiKey = [System.Environment]::GetEnvironmentVariable('BD_API_KEY', 'Process')
$siteUrl = [System.Environment]::GetEnvironmentVariable('BD_SITE_URL', 'Process')
$siteUrl = $siteUrl.TrimEnd('/')

Write-Host "URL: $siteUrl"
Write-Host "Key set: $($null -ne $apiKey -and $apiKey -ne '')"

# Test 1: widget_id as number (JSON)
Write-Host "`n--- Test 1: widget_id=17 (JSON) ---"
try {
  $resp = Invoke-WebRequest `
    -Uri "$siteUrl/api/v2/data_widgets/render" `
    -Headers @{ 'X-Api-Key' = $apiKey; 'Content-Type' = 'application/json' } `
    -Method POST -Body '{"widget_id": 17}' -UseBasicParsing
  Write-Host "Status: $($resp.StatusCode)"
  Write-Host $resp.Content.Substring(0, [Math]::Min(500, $resp.Content.Length))
} catch {
  $s = $_.Exception.Response.GetResponseStream()
  Write-Host "Error: $((New-Object System.IO.StreamReader($s)).ReadToEnd())"
}

# Test 2: widget_name
Write-Host "`n--- Test 2: widget_name ---"
try {
  $body = '{"widget_name": "Bootstrap Theme Framework"}'
  $resp2 = Invoke-WebRequest `
    -Uri "$siteUrl/api/v2/data_widgets/render" `
    -Headers @{ 'X-Api-Key' = $apiKey; 'Content-Type' = 'application/json' } `
    -Method POST -Body $body -UseBasicParsing
  Write-Host "Status: $($resp2.StatusCode)"
  Write-Host $resp2.Content.Substring(0, [Math]::Min(500, $resp2.Content.Length))
} catch {
  $s2 = $_.Exception.Response.GetResponseStream()
  Write-Host "Error: $((New-Object System.IO.StreamReader($s2)).ReadToEnd())"
}

# Test 3: form-encoded widget_id
Write-Host "`n--- Test 3: form-encoded widget_id=17 ---"
try {
  $resp3 = Invoke-WebRequest `
    -Uri "$siteUrl/api/v2/data_widgets/render" `
    -Headers @{ 'X-Api-Key' = $apiKey } `
    -Method POST -Body 'widget_id=17' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
  Write-Host "Status: $($resp3.StatusCode)"
  Write-Host $resp3.Content.Substring(0, [Math]::Min(500, $resp3.Content.Length))
} catch {
  $s3 = $_.Exception.Response.GetResponseStream()
  Write-Host "Error: $((New-Object System.IO.StreamReader($s3)).ReadToEnd())"
}
