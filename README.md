# TabTahoe

A macOS-inspired new tab extension for Brave and Chromium. Frosted glass, nature wallpapers, and everyday essentials in one quiet dashboard.

**Version 1.0.0** · Manifest V3 · No build step, dependencies, accounts, or API keys required.

## Install

1. Download a release ZIP and extract it, or clone this repository.
2. Open `brave://extensions` (or `chrome://extensions`) and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Open a new tab and accept the browser's new-tab change prompt if shown.

After changing the source, click **Reload** on the extension card and open a new tab. When updating an unpacked installation, replace the files in the same folder and reload the existing extension.

A GitHub release distributes the files for manual installation. It does not publish the extension to the Chrome Web Store.

## Version 1 features

### Favourites

- Add shortcuts and organise them into groups, including nested groups.
- Pages adapt to the available height, showing up to 12 tiles. Navigate with arrows, page dots, or a horizontal swipe. A focused favourites grid also accepts arrow keys.
- Drag onto a shortcut to reorder, or onto a group to move inside it. Hover over a page arrow while dragging to reach another page.
- Inside a group, drop onto **Favourites** to move an item back out. The shortcut editor also lists every group as a destination.
- Right-click a shortcut to edit it. Groups can be renamed from their dialog.
- A larger garbage icon appears only while dragging. Drop a shortcut or group onto it to remove it; deleting a group includes its contents. **Undo** is available for 10 seconds.
- Website logos use Chromium's favicon lookup, followed by common website icon paths. Missing icons fall back to the first letter of the domain.

### Calendar and daily tasks

- Navigate months or return to **Today**.
- Double-click any date to open its glass task panel. With a date focused, press Enter or Space to open it by keyboard.
- Add a single-sentence title of up to **80 characters**, with no description.
- Click the circular toggle to strike through a completed task; click again to reopen it. Completed tasks remain in the list. The small × deletes a task.
- Dots mark dates with tasks. Each date has its own list, based on the local calendar rather than UTC.
- Tasks persist across new tabs and browser restarts. Other open dashboard tabs refresh when task storage changes.

### Weather, clock, and bookmarks

- **Weather:** Choose a city, view current conditions and the daily temperature range, and switch between Celsius and Fahrenheit. Forecasts refresh every 15 minutes while the dashboard is open. Powered by [Open-Meteo](https://open-meteo.com/), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Clock:** Local time and date with an optional 24-hour clock.
- **Bookmarks:** Search browser bookmarks, including nested folders, and pin up to six visible favourites. Access is read-only. Non-web bookmarks must be opened through the browser's bookmark manager.

### Website sound control

Select an open website, such as YouTube, to mute/unmute its entire tab or jump to it. Playing tabs appear first; a selected tab remains selected when paused.

Choose **Enable playback controls for this site** to grant access to that website. Compatible HTML audio/video players then support play/pause, seeking, and volume. Website access is optional and can be revoked in the browser's extension settings.

Some custom players, Web Audio, inaccessible cross-origin embeds, and protected browser pages cannot expose playback controls. Tab muting remains available for listed website tabs. For embedded media, open the media website's own tab. This widget does not control system audio.

### Backgrounds and appearance

Open **Customize** to change your name, search engine, clock format, glass opacity, and visible widgets.

**Shortcut appearance** offers four choices:

| Style | Appearance |
| --- | --- |
| Coloured boxes | Website icons on coloured tiles |
| Frosted glass boxes | Translucent boxes matching the dashboard |
| Clear glass boxes · no colour | Nearly transparent, untinted boxes with subtle borders and lighter blur |
| Icons only | Website icons with their names underneath |

Styles also apply to shortcuts inside groups. Folder containers remain visible. Both glass styles follow the glass opacity preference.

For backgrounds:

- Choose one of three bundled nature wallpapers, or rotate them on each new tab, every 5/15 minutes, hourly, or daily.
- Upload a **JPG, PNG, WebP, or AVIF** image up to **25 MB**. Images are resized to a maximum edge of 2560 pixels and saved locally. **Use uploaded image** restores your saved upload; **Remove upload** deletes it.
- **Explore Unsplash photos** opens a small curated selection with photographer credits. These are fixed photo choices; version 1 has no live Unsplash search or API account connection.
- Uploaded images stay selected until you change the background. Automatic rotation applies to bundled wallpapers. The bottom-left landscape button changes the wallpaper, cycles the Unsplash choices, or returns an uploaded background to the bundled collection.

Timed wallpaper rotation resumes when the dashboard is reopened. No background process runs while all dashboard tabs are closed.

### Search and layout

Enter a web address or search query. **Ctrl+K / Cmd+K** focuses search when the page has keyboard focus; a fresh new tab initially focuses the browser address bar.

The desktop layout uses the viewport height, with Favourites aligned to the widget column. Shortcuts paginate as space changes. On narrow or very short screens, content scrolls inside the dashboard to keep controls accessible.

## Glass theme

Dashboard panels and all in-app dialogs share translucent wallpaper-tinted surfaces, blur and saturation, light borders, inset highlights, rounded corners, and system typography. Weather setup, shortcuts, groups, calendar tasks, bookmarks, and Customize use matching glass controls. The opacity preference also applies to dialogs.

Future UI changes must reuse the shared surface and control tokens in `styles.css`. Contributor guidance is in `AGENTS.md` in the development workspace. Native file pickers, permission prompts, and select popups use the browser or OS appearance.

## Storage and privacy

| Data | Installed extension | Web preview |
| --- | --- | --- |
| Settings, shortcuts, bookmark pins | `chrome.storage.local` | `localStorage`, key `tabtahoe` |
| Calendar task titles and completion | `chrome.storage.local`, one `calendarTasks:YYYY-MM-DD` key per date | `localStorage`, key `tabtahoe-calendar-tasks` |
| Uploaded wallpaper | Local IndexedDB, database `tabtahoe-backgrounds` | Local IndexedDB |
| Open-tab titles and playback state | In memory while the dashboard is open | Unavailable |

Tasks and preferences stay in the current browser profile. There is no account, cloud backup, or cross-device sync. Uploaded backgrounds are never uploaded to a server. There are no analytics, remote scripts, or remote fonts.

Network requests are limited to the features you use:

- **Open-Meteo:** City search sends the city query; forecast requests send the chosen coordinates and temperature unit.
- **Website icons:** Chromium's favicon cache is tried first. Fallback requests go directly to website icon paths, without a third-party favicon service or referrer. These requests expose your IP address to the website and may use normal browser cookies.
- **Unsplash:** Gallery thumbnails and selected online backgrounds load from `images.unsplash.com`, exposing standard image request metadata and your IP address. Online backgrounds require a connection; bundled and uploaded images work offline.
- **Search and links:** Open the search engine or website you choose.

### Browser permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Save preferences, shortcuts, pins, and tasks locally |
| `bookmarks` | Read browser bookmarks and keep the widget current |
| `tabs` | List website tabs and titles for the sound selector |
| `scripting` | Run bundled media-control code on websites you enable |
| `favicon` | Retrieve website icons through Chromium's favicon lookup |
| Open-Meteo host access | Fetch city search results and weather forecasts |
| Optional HTTP/HTTPS site access | Enable playback controls for a selected website when requested |

Calendar tasks introduce no additional permission or network service.

## Development

There is no compilation step or dependency installation.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173` for a web preview. Bookmarks and website sound controls require the installed extension. Preview data and extension data are separate.

Available checks, requiring Node.js 22 or later:

```sh
npm test
npm run test:browser
```

The browser smoke check expects Brave at `/opt/brave.com/brave/brave`, or a Chromium-compatible executable specified by `BRAVE_BIN`. Screenshots go into ignored `test-results/`. Run verification appropriate to the release; the presence of these commands does not mean they have been run for a particular revision.

## Release version 1.0.0 on GitHub

A **tag** names a specific commit. A **GitHub release** adds release notes and downloadable assets to that tag. The project version is `1.0.0` in both `manifest.json` and `package.json`; the matching tag is `v1.0.0`.

### 1. Commit and push the first version

Create an empty GitHub repository named `TabTahoe`, without an initial README. From this project folder, review the files and create the first commit:

```sh
git status --short
git add .gitignore README.md manifest.json index.html styles.css app.js core.js package.json assets tests
git commit -m "Release TabTahoe 1.0.0"
git branch -M main
```

Connect your repository, replacing `YOUR_USERNAME`:

```sh
git remote add origin https://github.com/YOUR_USERNAME/TabTahoe.git
git push -u origin main
```

If `origin` is already configured, use that remote instead of adding it again. The `main` rename above is for the initial setup; use your established branch name for an existing project.

### 2. Create and push an annotated tag

After committing the exact version you want to distribute:

```sh
git tag -a v1.0.0 -m "TabTahoe 1.0.0"
git push origin v1.0.0
```

### 3. Prepare an extension ZIP

On Linux/macOS, export the runtime files and installation instructions directly from the tag:

```sh
git archive --format=zip --output=/tmp/TabTahoe-v1.0.0.zip v1.0.0 manifest.json index.html styles.css app.js core.js assets README.md
```

The ZIP has `manifest.json` at its root and excludes development files and Git metadata. It is created from the tagged commit, so uncommitted edits are not included.

### 4. Publish the release

On GitHub, open **Releases → Draft a new release**, select **v1.0.0**, and use **TabTahoe 1.0.0** as the title. Add release notes, attach the ZIP, and publish when ready. GitHub also provides source archives for the tag.

Suggested notes:

> First version of TabTahoe: a glass macOS-inspired new tab with paginated favourites and nested groups, daily calendar tasks, weather, a local clock, bookmark pins, website sound controls, custom backgrounds, and four shortcut styles. Data stays local. Extract the ZIP and use Load unpacked in Brave or Chromium. Website playback controls require per-site access; Unsplash photos are curated choices.

For later releases, update both version files before committing and tagging. Use `v1.0.1` for fixes or `v1.1.0` for added features. Give each published version its own tag rather than moving an existing tag to new code.

References: [Git tags](https://git-scm.com/docs/git-tag), [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [creating a release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

## Assets and credits

Three wallpapers are bundled for offline use. The Alpine image comes from the supplied Stitch design; the bundled forest and coast images come from Unsplash ([forest source](https://images.unsplash.com/photo-1448375240586-882707db888b), [coast source](https://images.unsplash.com/photo-1473116763249-2faaef81ccda)). Review the original asset usage rights before commercial redistribution.

Online gallery photos: [forest by Sebastian Unrau](https://unsplash.com/photos/landscape-photography-of-forest-dJVU4jXV1Q8) and [beach by Sean Oulashin](https://unsplash.com/photos/seashore-during-golden-hour-KMn4VEeEPR8). Live Unsplash API features would require a registered application and adherence to the [Unsplash API guidelines](https://unsplash.com/documentation).

UI controls use local SVG and text. Shortcut logos are website favicons, with local letter fallbacks.
