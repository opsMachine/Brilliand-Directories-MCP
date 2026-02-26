$url = "$env:BD_SITE_URL/api/v2/data_widgets/get"
Write-Host "Testing: $url"
Write-Host ""

$request = [System.Net.HttpWebRequest]::Create($url)
$request.Headers.Add("X-Api-Key", $env:BD_API_KEY)
$request.Method = "GET"
$request.AllowAutoRedirect = $false

try {
    $response = $request.GetResponse()
    Write-Host "Status: $([int]$response.StatusCode) $($response.StatusCode)"
    Write-Host "Content-Type: $($response.ContentType)"
    Write-Host "Location: $($response.Headers['Location'])"
    $stream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host ""
    Write-Host "Body (first 500 chars):"
    Write-Host ($body.Substring(0, [Math]::Min(500, $body.Length)))
    $response.Close()
} catch [System.Net.WebException] {
    $errResponse = $_.Exception.Response
    if ($errResponse) {
        Write-Host "Status: $([int]$errResponse.StatusCode) $($errResponse.StatusCode)"
        Write-Host "Location: $($errResponse.Headers['Location'])"
        $stream = $errResponse.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host ($reader.ReadToEnd().Substring(0, 300))
    } else {
        Write-Host "Error: $($_.Exception.Message)"
    }
}
