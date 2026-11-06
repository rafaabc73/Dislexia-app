#!/bin/bash
cd "$(dirname "$0")"
ROOT_DIR="$(pwd)"
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$PATH"

# Remove eventual quarentena do macOS ao baixar ZIP do GitHub
xattr -cr "$ROOT_DIR" 2>/dev/null || true

echo "========================================================="
echo "  Dislexia App — Ambiente Isolado no seu Mac (macOS)"
echo "========================================================="

# 1. Garante a estrutura física de pastas no Mac mesmo se o Node.js não estiver instalado
YEARS=("2025 - 6º Ano" "2026 - 7º Ano" "2027 - 8º Ano" "2028 - 9º Ano" "Ensino Médio - 1º Ano" "Ensino Médio - 2º Ano" "Ensino Médio - 3º Ano")
SUBJECTS=("Informacoes_Gerais_Boletim" "Lingua_Portuguesa" "Matematica" "Ciencias_Biologia" "Historia" "Geografia" "Lingua_Inglesa" "Fisica" "Quimica" "Redacao_e_Leitura" "Artes")
MONTHS=("01_Janeiro" "02_Fevereiro" "03_Marco" "04_Abril" "05_Maio" "06_Junho" "07_Julho" "08_Agosto" "09_Setembro" "10_Outubro" "11_Novembro" "12_Dezembro")

for y in "${YEARS[@]}"; do
  for s in "${SUBJECTS[@]}"; do
    mkdir -p "$ROOT_DIR/Pastas_do_Aluno/$y/$s/Provas"
    for m in "${MONTHS[@]}"; do
      mkdir -p "$ROOT_DIR/Pastas_do_Aluno/$y/$s/$m"
    done
  done
done
echo "✅ Estrutura física de pastas pronta em: $ROOT_DIR/Pastas_do_Aluno"

# 2. Cria o aplicativo nativo 'Dislexia App.app' na Mesa (Desktop) e em ~/Applications
create_mac_app_bundle() {
  local APP_PATH="$1"
  mkdir -p "$APP_PATH/Contents/MacOS"
  mkdir -p "$APP_PATH/Contents/Resources"

  cat > "$APP_PATH/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>DislexiaApp</string>
  <key>CFBundleIdentifier</key>
  <string>org.dislexiaapp.desktop</string>
  <key>CFBundleName</key>
  <string>Dislexia App</string>
  <key>CFBundleDisplayName</key>
  <string>Dislexia App</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

  cat > "$APP_PATH/Contents/MacOS/DislexiaApp" <<EOF
#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:\$PATH"
cd "$ROOT_DIR"
if command -v node >/dev/null 2>&1; then
  node "$ROOT_DIR/scripts/start-desktop-app.mjs" >/tmp/dislexia-app.log 2>&1 &
else
  FILE_URL="file://$ROOT_DIR/index.html"
  if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --app="\$FILE_URL" --window-size=1400,900 >/dev/null 2>&1 &
  elif [ -x "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" ]; then
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --app="\$FILE_URL" --window-size=1400,900 >/dev/null 2>&1 &
  elif [ -x "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" ]; then
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --app="\$FILE_URL" --window-size=1400,900 >/dev/null 2>&1 &
  else
    open "$ROOT_DIR/index.html"
  fi
fi
EOF

  chmod +x "$APP_PATH/Contents/MacOS/DislexiaApp"
  xattr -cr "$APP_PATH" 2>/dev/null || true
}

create_mac_app_bundle "$HOME/Desktop/Dislexia App.app"
create_mac_app_bundle "$HOME/Applications/Dislexia App.app"
echo "✅ Aplicativo 'Dislexia App.app' instalado na sua Mesa (Desktop) e em Aplicativos!"

# 3. Inicia o aplicativo (com Node.js se disponível, ou direto pelo bundle pré-compilado sem precisar instalar nada!)
if command -v node >/dev/null 2>&1; then
  # Encerra instância antiga na porta 45678 para garantir atualização limpa
  lsof -ti:45678 | xargs kill -9 2>/dev/null || true
  node "$ROOT_DIR/scripts/start-desktop-app.mjs"
else
  echo "🚀 Abrindo o Dislexia App diretamente (Modo Standalone Isolado)..."
  FILE_URL="file://$ROOT_DIR/index.html"
  if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --app="$FILE_URL" --window-size=1400,900 >/dev/null 2>&1 &
  elif [ -x "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" ]; then
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --app="$FILE_URL" --window-size=1400,900 >/dev/null 2>&1 &
  elif [ -x "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" ]; then
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --app="$FILE_URL" --window-size=1400,900 >/dev/null 2>&1 &
  else
    open "$ROOT_DIR/index.html"
  fi
fi
