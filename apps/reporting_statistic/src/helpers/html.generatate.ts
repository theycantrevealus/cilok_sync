export async function tableGenerate(payload) {
  const html = [];
  const title = payload?.title
  const headerList = payload?.headers
  const bodyList = payload?.bodies
  html.push(`<div class='flex-container'>`);
  if(title){
    html.push(`<H4>${title}</H4>`);
  }
  html.push(`<table width='100%'>`);

  // Set Header (th)
  html.push(`<tr>`);
  for (let i = 0; i < headerList.length; i++) {
    html.push(`<th>${headerList[i].toUpperCase()}</th>`)
  }
  html.push(`</tr>`);
  // End Set Header (th)

  // Set Body (td)
  for (let i = 0; i < bodyList.length; i++) {
    html.push(`<tr>`);
    const bodyItem = JSON.parse(JSON.stringify(bodyList[i]));
    let curr = Object.values(bodyItem);
    for (const j in curr) {
      html.push(`<td>${curr[j]}</td>`)
    }
    html.push(`</tr>`);
  }
  // End Set Body (td)
  html.push(`</table>`);
  html.push(`</div>`);
  return html.join('');
};
