const uid = () => crypto.randomUUID();
const app = (title, url, color, icon) => ({ id: uid(), title, url, color, icon });
const group = (title, children) => ({ id: uid(), title, children });
export const initialApps = () => [
  group('AI Tools', [app('ChatGPT', 'https://chatgpt.com', '#17a884', '✳'), app('Claude', 'https://claude.ai', '#c88866', '✺'), app('Perplexity', 'https://perplexity.ai', '#318a9a', '⌘'), app('Gemini', 'https://gemini.google.com', '#7777d8', '✦')]),
  group('Dev Stack', [app('GitHub', 'https://github.com', '#24292e', 'github'), app('VS Code', 'https://vscode.dev', '#178ac3', '⌘'), app('AWS', 'https://aws.amazon.com', '#ee992e', 'aws'), app('Docker', 'https://hub.docker.com', '#268deb', '▰')]),
  app('YouTube', 'https://youtube.com', '#ed354a', 'youtube'),
  app('Notion', 'https://notion.so', '#f6f6f3', 'notion'),
  app('Spotify', 'https://open.spotify.com', '#25bc66', 'spotify'),
  app('Figma', 'https://figma.com', '#292b30', 'figma'),
  app('X / Twitter', 'https://x.com', '#101114', '𝕏'),
  app('Reddit', 'https://reddit.com', '#f47735', 'reddit'),
  app('Gmail', 'https://mail.google.com', '#f7f7f4', 'mail'),
  app('GitHub', 'https://github.com', '#20272b', 'github'),
  app('Linear', 'https://linear.app', '#7881d5', 'linear'),
  group('Entertainment', [app('Netflix', 'https://netflix.com', '#d82d3f', 'N'), app('Twitch', 'https://twitch.tv', '#8a55d3', '▣'), app('Discord', 'https://discord.com/app', '#6674ce', '☷'), app('Apple TV', 'https://tv.apple.com', '#283a4a', 'tv')]),
];
