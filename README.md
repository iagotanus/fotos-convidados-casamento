# Fotos do casamento

Site estático para exibir as fotos dos convidados e permitir o envio delas a uma pasta do Google Drive. O site pode ser publicado pelo GitHub Pages; o Google Apps Script faz a integração com o Drive.

## Configuração do Google Drive

1. Crie uma pasta no Drive dedicada às fotos que serão exibidas. A galeria lista todas as imagens dessa pasta, então não use uma pasta com arquivos privados.
2. Copie o ID da pasta a partir do endereço do Drive. Ele é o trecho que vem depois de `/folders/`; não inclua parâmetros como `?hl=pt-br`.
3. Crie um projeto em [script.google.com](https://script.google.com/) e cole o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs) no arquivo `Code.gs`.
4. No início do script, substitua `COLOQUE_O_ID_DA_PASTA_AQUI` pelo ID da pasta.
5. Execute `doGet` no editor do Apps Script e autorize o acesso ao Drive.
6. Publique o projeto como **Aplicativo da Web**, executando como você e permitindo acesso a **Qualquer pessoa**. Copie a URL terminada em `/exec`.
7. Em [`app.js`](app.js), atribua essa URL à constante `APPS_SCRIPT_URL`.
8. Compartilhe a **pasta** no Drive com acesso de visualização para **qualquer pessoa com o link**. As fotos enviadas herdam o acesso da pasta; o script não altera as permissões individualmente. Se sua conta ou organização não permitir compartilhamento público, as fotos não poderão ser exibidas publicamente.

Sempre que alterar `Code.gs`, publique uma **nova versão** em **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**. Alterações em `app.js` também precisam ser publicadas no GitHub Pages para chegarem ao site.

Se o envio falhar, abra **Apps Script → Execuções** no mesmo projeto e confira a execução mais recente de `doPost`. O script registra `UPLOAD_STARTED`, `UPLOAD_SUCCEEDED` ou `UPLOAD_FAILED` e a etapa da falha. Se nenhuma execução aparecer, confira se está olhando o projeto associado à URL `/exec` configurada em `app.js`.

Se o botão ficar em “Enviando…”, confirme que a implantação ativa do Apps Script e o site usam as versões atualizadas: a página aguarda uma confirmação do Apps Script e encerra a espera após 45 segundos se ela não chegar.

> O endpoint de envio é público e qualquer visitante pode adicionar imagens à pasta compartilhada. Use uma pasta dedicada, considere os limites e as políticas de compartilhamento da sua conta Google e não coloque arquivos privados nela. O site permite selecionar várias imagens por envio, processadas uma de cada vez; cada imagem deve ser JPEG, PNG ou WebP e ter até 8 MB.

## Publicação no GitHub Pages

Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`. Depois de publicar, acesse a URL informada pelo GitHub Pages.

## Desenvolvimento local

Abra `index.html` em um navegador ou sirva a pasta com um servidor HTTP local. Sem configurar `APPS_SCRIPT_URL`, a página explica que a galeria e o envio ainda não estão conectados.
