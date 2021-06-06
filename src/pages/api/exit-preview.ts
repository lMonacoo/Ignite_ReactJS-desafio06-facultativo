// Limpar as informações de preview e redirecionar o usuário para a página principal

export default async (_, res): Promise<void> => {
  res.clearPreviewData();

  res.writeHead(307, { Location: '/' });
  res.end();
};
