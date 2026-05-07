import Script from "next/script";

const script = `
(() => {
  const key = "worklog-theme";
  const stored = window.localStorage.getItem(key);
  const theme = stored === "light" || stored === "dark" ? stored : "dark";
  document.documentElement.dataset.theme = theme;
})();
`;

export function ThemeScript() {
  return <Script dangerouslySetInnerHTML={{ __html: script }} id="worklog-theme-script" strategy="afterInteractive" />;
}
