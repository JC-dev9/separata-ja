/**
 * URL de pesquisa no YouTube para uma música do hinário.
 *
 * A app abre isto no browser ou na aplicação do YouTube, em vez de embutir o
 * site num WebView: carregar o YouTube dentro da app obriga a forjar o
 * user-agent para contornar o bloqueio, viola os termos de utilização e quebra
 * sem aviso sempre que eles mudam a detecção.
 */
export function youtubeSearchUrl(songTitle: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(songTitle)}`;
}
