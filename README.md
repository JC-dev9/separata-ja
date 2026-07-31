# Saltério

Hinário digital com cifras, transposição de tons, dicionário de acordes
(violão e teclado), rolagem automática e afinador de instrumentos.

Construído com [Expo](https://expo.dev) (SDK 54), React Native 0.81 e
expo-router.

---

## Começar

```bash
npm install
npx expo start
```

Para correr num dispositivo/emulador com código nativo:

```bash
npm run android
npm run ios
```

> O afinador usa o microfone, que não funciona no Expo Go. É preciso uma
> [development build](https://docs.expo.dev/develop/development-builds/introduction/).

---

## Verificações

Os três comandos que o CI corre em cada push e pull request:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest
```

Ver `.github/workflows/ci.yml`.

---

## Estrutura

```
app/                    Rotas (expo-router)
  (tabs)/               Separadores: hinário, favoritos, afinador
  song/[id].tsx         Ecrã da música
src/
  components/           Componentes de UI
  data/                 Carregamento do hinário e formas de acordes
  hooks/                Estado partilhado e persistência
  utils/                Lógica pura (parser, transposição, pitch)
  theme/                Paleta e espaçamentos
assets/database.json    Os 538 hinos
assets/Logos Separata/  Fontes vetoriais da logo oficial
```

### Ícones

Os ícones em `assets/images/` são gerados a partir de
`assets/Logos Separata/Logo Claro.svg`. Se a logo mudar:

```bash
npm install --no-save sharp
node scripts/generate-icons.js
```

A variante **Claro** (`#E5EEFC`) é a usada na app, porque a interface é toda
escura; a variante **Escuro** (`#0E1E2F`) fica reservada para materiais sobre
fundo claro.

### Notas de arquitectura

- **Lógica pura isolada.** `chord-parser`, `chord-transposer` e `pitch` não
  dependem do React nem do React Native, e é onde vive a cobertura de testes.
- **Persistência sem context.** Os hooks (`useFavorites`, `useSongOverride`,
  `useFontSize`, `useChordDictionaryCollapsed`) partilham estado através de um
  cache em módulo com lista de listeners, hidratado do AsyncStorage no arranque.
  Evita re-renders em cascata numa lista de 538 itens.
- **Edições do utilizador são versionadas.** Cada edição guarda um hash do
  conteúdo original em que se baseou. Se o hinário for actualizado, a app
  detecta a divergência e propõe descartar a versão antiga
  (ver `useSongOverride`).
- **Desfazer é de um nível só** e desaparece ao fim de 4 segundos — decisão
  deliberada para manter a barra de edição simples.

---

## Build e publicação

Requer a [CLI da EAS](https://docs.expo.dev/build/setup/) e sessão iniciada
(`eas login`).

```bash
eas build --profile preview --platform android     # APK para testar
eas build --profile production --platform android  # AAB para a Play Store
eas build --profile production --platform ios      # IPA para a App Store
```

A versão (`versionCode`/`buildNumber`) é gerida pela EAS: `eas.json` tem
`appVersionSource: "remote"` e `autoIncrement` no perfil de produção. Sobe o
`version` em `app.json` manualmente quando quiseres uma nova versão pública.

### Actualizações OTA

`expo-updates` está instalado com `runtimeVersion.policy: "fingerprint"` — uma
actualização OTA só chega a binários com dependências nativas compatíveis.

**Falta um passo único de configuração** (precisa de sessão EAS interactiva):

```bash
eas init                # cria o projeto e escreve extra.eas.projectId
eas update:configure    # escreve updates.url em app.json
```

Depois disso, publicar uma correcção de JS sem passar pelas lojas:

```bash
eas update --branch production --message "corrige X"
```

---

## Antes de publicar

- [ ] Correr `eas init` e `eas update:configure` (ver acima).
- [ ] Publicar `PRIVACY.md` num URL público (ex.: GitHub Pages) e usá-lo nas
      duas lojas — é obrigatório por causa da permissão de microfone.
- [ ] Preencher o **Data Safety** (Play) e o **App Privacy** (App Store);
      `PRIVACY.md` tem as respostas coerentes no fim.
- [ ] Confirmar os direitos de utilização das letras e cifras em
      `assets/database.json`.
- [ ] Testar o afinador em dispositivos Android de fabricantes diferentes — a
      captura de áudio corre num WebView e o comportamento varia.
- [ ] Rever o `ListenSheet`: carrega o YouTube num WebView com user-agent
      forjado, o que pode quebrar sem aviso e é mal visto na revisão das lojas.
