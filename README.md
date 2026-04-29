# Rocket League Team Manager

A browser dashboard for managing a Rocket League roster, schedule, match records, and league standings.

## Use It Locally

Open `index.html` in a browser or run it with a local server such as the VS Code Live Server extension.

The dashboard saves data in the browser automatically. Use `Export backup` to download a local JSON backup, and `Import backup` to restore it.

## Publish With GitHub Pages

1. Create a new GitHub repository named `rocket-league-dashboard`.
2. Push these files to the repository.
3. In GitHub, go to `Settings` -> `Pages`.
4. Set source to `Deploy from a branch`.
5. Choose branch `main` and folder `/root`.
6. Open the GitHub Pages URL from your phone, laptop, or PC.

## Data Sync Note

GitHub Pages can host the dashboard everywhere, but it does not automatically sync browser data between devices. For now, use backup import/export to move data between devices. For true live sync, connect the dashboard to a cloud database such as Supabase or Firebase.
