
$files = @(
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/FormationTable.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/auth/EditProfile.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/auth/Profile.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/besoin/BesoinForm.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/besoin/BesoinList.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/competence/AffectationEnseignantPage.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/competence/EnseignantCompetencePage.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/competence/RicePage.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/competence/components/consultation/ExportMenu.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/enseignant/TeachersDataGrid.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/enseignant/UpDeptDataGrid.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/evaluation/EvaluationGlobalePage.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/formation/FormationConsultationPage.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/gererComptes/ListAccounts.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/inscription/DemandesList.jsx",
    "c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-webapp/src/pages/inscription/FormationCards.jsx"
)

foreach ($f in $files) {
    if (-not (Test-Path $f)) { Write-Host "NOT FOUND: $f"; continue }
    $content = Get-Content $f -Raw -Encoding UTF8
    $original = $content

    # 1) Replace "const [msgApi, msgCtx] = message.useMessage();" with "const { message: msgApi } = useAppNotification();"
    $content = $content -replace 'const \[msgApi,\s*msgCtx\]\s*=\s*message\.useMessage\(\)', 'const { message: msgApi } = useAppNotification()'

    # 2) Replace "const [messageApi, contextHolder] = message.useMessage();" with "const { message: messageApi } = useAppNotification();"
    $content = $content -replace 'const \[messageApi,\s*contextHolder\]\s*=\s*message\.useMessage\(\)', 'const { message: messageApi } = useAppNotification()'

    # 3) Replace "const [msgApi, contextHolder] = message.useMessage();" with "const { message: msgApi } = useAppNotification();"
    $content = $content -replace 'const \[msgApi,\s*contextHolder\]\s*=\s*message\.useMessage\(\)', 'const { message: msgApi } = useAppNotification()'

    # 4) Remove {msgCtx} from JSX
    $content = $content -replace '\{msgCtx\}\s*\n?', ''

    # 5) Remove {contextHolder} from JSX (only if from message.useMessage, not notification.useNotification)
    # We need to be careful - only remove if it was from message.useMessage
    $content = $content -replace '\{contextHolder\}\s*\n?', ''

    # 6) Add useAppNotification import if not present
    if ($content -notmatch 'useAppNotification') {
        # Find the relative path to hooks
        $depth = ($f.Split('/').Count - ($f.Split('/').IndexOf('src') + 1)) - 1
        $prefix = '../' * $depth
        $importLine = "import useAppNotification from `"$($prefix)hooks/useAppNotification`";"
        # Add after the last antd import
        $content = $content -replace "(import .+ from .antd.[^\n]*)\n", "`$1`n$importLine`n" 
    }

    # 7) Remove "message," from antd imports if message is no longer used directly
    # Check if message is still used (not via useAppNotification)
    $msgUsage = [regex]::Matches($content, 'message\.') | Where-Object { $_.Value -ne 'message.' -or $_.Index -gt 0 }
    $hasDirectMessageUsage = $content -match 'message\.(success|error|warning|info|loading)\('
    if (-not $hasDirectMessageUsage) {
        # Remove message from antd import
        $content = $content -replace ',\s*message,', ','
        $content = $content -replace 'message,\s*', ''
        $content = $content -replace ',\s*message\b', ''
    }

    if ($content -ne $original) {
        Set-Content $f -Value $content -Encoding UTF8 -NoNewline
        Write-Host "FIXED: $([System.IO.Path]::GetFileName($f))"
    } else {
        Write-Host "NO CHANGE: $([System.IO.Path]::GetFileName($f))"
    }
}
