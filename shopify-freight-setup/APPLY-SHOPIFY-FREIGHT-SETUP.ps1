$ErrorActionPreference = 'Stop'
$store = 'ahygpy-ag.myshopify.com'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

npx.cmd --yes @shopify/cli@latest store auth --store $store --scopes write_inventory,read_inventory,read_products,write_shipping
if ($LASTEXITCODE -ne 0) { throw 'Shopify-Anmeldung fehlgeschlagen.' }

npx.cmd --yes @shopify/cli@latest store execute --store $store --query-file (Join-Path $root 'freight-weights.graphql') --allow-mutations
if ($LASTEXITCODE -ne 0) { throw 'Produktgewichte konnten nicht aktualisiert werden.' }

npx.cmd --yes @shopify/cli@latest store execute --store $store --query-file (Join-Path $root 'freight-profiles.graphql') --allow-mutations
if ($LASTEXITCODE -ne 0) { throw 'Versandprofile konnten nicht aktualisiert werden.' }

Write-Host ''
Write-Host 'Fertig: Gewichte und Speditionsstaffeln 1-10 wurden aktualisiert.' -ForegroundColor Green

