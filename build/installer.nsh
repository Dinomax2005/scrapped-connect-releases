; SCRAPPED Connect — NSIS customisation
; Electron-builder runs these macros inside the generated installer.

!macro customInstall
  ; Make sure the workspace folder exists so the first launch writes data
  ; next to the app instead of failing on a read-only path.
  CreateDirectory "$APPDATA\SCRAPPED Connect"
  ; Drop the setup guide next to the shortcuts for easy reference.
  FileOpen $0 "$APPDATA\SCRAPPED Connect\SETUP-GUIDE.txt" w
  FileWrite $0 "SCRAPPED Connect setup complete.$\r$\n"
  FileWrite $0 "Workspace: $APPDATA\SCRAPPED Connect\scrapped-connect-data.json$\r$\n"
  FileWrite $0 "Updates: github.com/Dinomax2005/scrapped-connect-releases$\r$\n"
  FileClose $0
!macroend

!macro customUnInstall
  ; Keep studio data unless the user removed it manually — data safety first.
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Also delete your SCRAPPED Connect studio data (accounts, ranks, dashboards, tasks)?$\r$\n$\r$\nChoose No to keep the workspace for a future reinstall." \
    IDNO keepData
  RMDir /r "$APPDATA\SCRAPPED Connect"
  keepData:
!macroend
