; =============================================================================
; StudyFlow Installer
; Created for: Akeem
; =============================================================================

#define MyAppName "StudyFlow"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Akeem"
#define MyAppURL "https://yourwebsite.com"
#define MyAppExeName "StudyFlow.exe"

#define MyAppFolder "E:\Software Development\StudyFlow\StudyFlow-win32-x64"
#define MyIcon "E:\Software Development\StudyFlow\src\Media\icon.ico"

[Setup]

AppId={{6F8A71E7-2A7D-4A50-BB56-9C2B0A7EAF21}

AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}

AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}

DisableProgramGroupPage=yes

AllowNoIcons=yes

LicenseFile=

PrivilegesRequired=admin

ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64

Compression=lzma2/max
SolidCompression=yes
LZMANumBlockThreads=4

WizardStyle=modern

SetupIconFile={#MyIcon}

OutputDir=Output
OutputBaseFilename=StudyFlow_Setup_v{#MyAppVersion}

UninstallDisplayIcon={app}\{#MyAppExeName}

VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=StudyFlow Installer
VersionInfoProductName={#MyAppName}
VersionInfoCopyright=© 2026 Akeem

ChangesAssociations=yes

UsePreviousAppDir=yes
UsePreviousTasks=yes

CloseApplications=yes
RestartApplications=no

DisableWelcomePage=no

ShowLanguageDialog=no

[Languages]

Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]

Name: "desktopicon"; Description: "Create a Desktop Shortcut"; GroupDescription: "Additional Shortcuts:"; Flags: unchecked

[Dirs]

Name: "{app}"

[Files]

Source: "{#MyAppFolder}\*"; \
DestDir: "{app}"; \
Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]

Name: "{autoprograms}\{#MyAppName}"; \
Filename: "{app}\{#MyAppExeName}"

Name: "{autodesktop}\{#MyAppName}"; \
Filename: "{app}\{#MyAppExeName}"; \
Tasks: desktopicon

Name: "{group}\Uninstall {#MyAppName}"; \
Filename: "{uninstallexe}"

[Run]

Filename: "{app}\{#MyAppExeName}"; \
Description: "Launch {#MyAppName}"; \
Flags: nowait postinstall skipifsilent

[UninstallDelete]

Type: filesandordirs; Name: "{app}"

[Code]

function InitializeSetup(): Boolean;
begin
  Result := True;
end;
