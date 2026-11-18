# Fotos do casamento

Site estático para exibir as fotos dos convidados e permitir o envio delas a uma pasta do Google Drive. O site pode ser publicado pelo GitHub Pages; o Google Apps Script faz a integração com o Drive.

## Configuração do Google Drive

1. Crie uma pasta no Drive dedicada às fotos que serão exibidas. A galeria lista todas as imagens dessa pasta, então não use uma pasta com arquivos privados.
2. Copie o ID da pasta a partir do endereço do Drive. Ele é o trecho que vem depois de `/folders/`.
3. Crie um projeto em [script.google.com](https://script.google.com/) e cole o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs) no arquivo `Code.gs`.
4. No início do script, substitua `COLOQUE_O_ID_DA_PASTA_AQUI` pelo ID da pasta.
5. Execute `doGet` no editor do Apps Script e autorize o acesso ao Drive.
6. Publique o projeto como **Aplicativo da Web**, executando como você e permitindo acesso a **Qualquer pessoa**. Copie a URL terminada em `/exec`.
7. Em [`app.js`](app.js), atribua essa URL à constante `APPS_SCRIPT_URL`.
8. Para as fotos que já existem, habilite no Drive o acesso de visualização por **qualquer pessoa com o link**. Os novos envios recebem essa permissão automaticamente.

> O endpoint de envio é público. Use uma pasta dedicada e considere os limites e as políticas de compartilhamento da sua conta Google. O site restringe os envios a imagens JPEG, PNG ou WebP de até 8 MB.

## Publicação no GitHub Pages

Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`. Depois de publicar, acesse a URL informada pelo GitHub Pages.

## Desenvolvimento local

Abra `index.html` em um navegador ou sirva a pasta com um servidor HTTP local. Sem configurar `APPS_SCRIPT_URL`, a página explica que a galeria e o envio ainda não estão conectados.
