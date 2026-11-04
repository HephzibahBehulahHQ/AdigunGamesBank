param([string]$BaseUrl = "https://hephzibahbehulah.github.io/Game-Bank/")
$ErrorActionPreference = "Stop"
$desktop = [Environment]::GetFolderPath("Desktop")
$folder = Join-Path $desktop "Game Bank Launchers"
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$games = @(
  @{ Name = "01 NEON PULSE - LED Light Designer"; Path = "game1/" },
  @{ Name = "02 CIRCUIT RUSH - Wire the Power"; Path = "game2/" },
  @{ Name = "03 ELECTRONICER - Circuit Lab"; Path = "game3/" },
  @{ Name = "04 VOLT DODGE"; Path = "game4/" },
  @{ Name = "05 RESISTOR MATCH"; Path = "game5/" },
  @{ Name = "06 CAPACITOR CHARGE"; Path = "game6/" },
  @{ Name = "07 BINARY FLASH"; Path = "game7/" },
  @{ Name = "08 FUSE BOX"; Path = "game8/" },
  @{ Name = "09 GOAL LINE - Football Penalties"; Path = "game9/" },
  @{ Name = "10 APEX CIRCUIT - Racing"; Path = "game10/" },
  @{ Name = "11 WORLD FOOTBALL - Season Play"; Path = "game11/" },
  @{ Name = "12 CORTEX PRIME - IQ"; Path = "game12/" },
  @{ Name = "13 SYNAPSE SPRINT - Memory"; Path = "game13/" },
  @{ Name = "14 BILLIONAIRE CHALLENGE"; Path = "game14/" },
  @{ Name = "15 TACTICS GRID - AI Tactics Arena"; Path = "game15/" },
  @{ Name = "16 APEX STRATEGY - Race Engineer"; Path = "game16/" },
  @{ Name = "17 PENALTY PRO - Adaptive Shootout"; Path = "game17/" },
  @{ Name = "18 DEBATE ARENA - AI Debate"; Path = "game18/" },
  @{ Name = "19 CASEFILE - AI Detective"; Path = "game19/" },
  @{ Name = "20 MARKET DUEL - AI Trader"; Path = "game20/" },
  @{ Name = "21 AI ARENA - Live Model Competition"; Path = "game22/" },
  @{ Name = "22 LAST SIGNAL - Battle Royale"; Path = "game21/" },
  @{ Name = "23 VALLEY OF ELAH - Davids Sling"; Path = "game23/" }
)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$crlf = [char]13 + [char]10
foreach ($game in $games) {
  $url = $BaseUrl.TrimEnd("/") + "/" + $game.Path
  $content = "[InternetShortcut]" + $crlf + "URL=" + $url + $crlf
  [System.IO.File]::WriteAllText((Join-Path $folder ($game.Name + ".url")), $content, $utf8)
}
Write-Host "Created $($games.Count) Game Bank web launchers in $folder"
$godot = Join-Path $PSScriptRoot ".local-tools\godot-4.7.2\Godot_v4.7.2-stable_win64.exe"
if (Test-Path -LiteralPath $godot) {
  $suite = Join-Path $PSScriptRoot "couch-suite"
  $suiteGames = @(
    @{ Name = "S01 KART GRAND PRIX"; Scene = "res://games/kart_grand_prix.tscn" },
    @{ Name = "S02 RALLY STAGE TIME TRIAL"; Scene = "res://games/rally_stage_time_trial.tscn" },
    @{ Name = "S03 FORMULA SPRINT"; Scene = "res://games/formula_sprint.tscn" },
    @{ Name = "S04 TRUCK TRIAL"; Scene = "res://games/truck_trial.tscn" },
    @{ Name = "S05 MOTORCYCLE HILL CLIMB"; Scene = "res://games/motorcycle_hill_climb.tscn" },
    @{ Name = "S06 SOAPBOX DERBY"; Scene = "res://games/soapbox_derby.tscn" },
    @{ Name = "S07 HOVERCRAFT TIME ATTACK"; Scene = "res://games/hovercraft_time_attack.tscn" },
    @{ Name = "S08 STOCK CAR OVAL"; Scene = "res://games/stock_car_oval.tscn" },
    @{ Name = "S09 MONSTER TRUCK ARENA"; Scene = "res://games/monster_truck_arena.tscn" },
    @{ Name = "S10 DRONE RACING"; Scene = "res://games/drone_racing.tscn" }
  )
  $shell = New-Object -ComObject WScript.Shell
  foreach ($game in $suiteGames) {
    $shortcut = $shell.CreateShortcut((Join-Path $folder ($game.Name + ".lnk")))
    $shortcut.TargetPath = $godot
    $shortcut.Arguments = "--path `"$suite`" --scene `"$($game.Scene)`""
    $shortcut.WorkingDirectory = $PSScriptRoot
    $shortcut.Description = "Hephzibah Behulah Game Bank — " + $game.Name
    $shortcut.Save()
  }
  Write-Host "Created $($suiteGames.Count) Godot couch-game launchers in $folder"
} else {
  Write-Host "Godot is not installed in .local-tools; web launchers were created."
}

