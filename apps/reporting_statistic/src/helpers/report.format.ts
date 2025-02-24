/* eslint-disable prettier/prettier */

const exclude = [
  '_id',
  '__v',
  'period',
  'created_at',
  'updated_at',
  'deleted_at',
  'agent',
  'agent_remark',
];

const titleCase = (str) => {
  const _str = str.replace(new RegExp('_', 'g'), ' ');
  return _str
    .toLowerCase()
    .split(' ')
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

const upperCase = (str) => {
  const _str = str.replace(new RegExp('_', 'g'), ' ');
  return _str.toUpperCase()
};

const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const getDataKey = (data) => {
  return Object.keys(data[0]).filter((e) => !['name', 'period'].includes(e));
};

const getTableHeader = (index, reportName, data) => {
  const html = [];

  html.push(`<thead>`);
  const dataKey = [];
  if (index == 0 || index == 7 || index == 12) dataKey.push(`period`);

  const dynamicDataKey = getDataKey(data);
  dynamicDataKey.forEach((e) => dataKey.push(titleCase(e)));

  html.push(`<tr style='border: 1px solid rgb(156, 156, 156)'><th nowrap colspan='${dataKey.length}'>${upperCase(reportName)}</th></tr>`);
  html.push(`<tr style='border: 1px solid rgb(156, 156, 156)'>`);
  dataKey.forEach((e) => {
    html.push(`<th nowrap style='border: 1px solid rgb(156, 156, 156)'>${titleCase(e)}</th>`);
  });
  html.push(`</tr>`);

  html.push(`</thead>`);

  return html.join('');
};

const getTableData = (index, data) => {
  const html = [];
  const dataKey = [];

  html.push(`<tbody>`);

  if (index == 0 || index == 7 || index == 12) dataKey.push(`period`);

  const dynamicDataKey = getDataKey(data);
  dynamicDataKey.forEach((e) => dataKey.push(e));

  // ada berapa jumlah datanya?
  data.forEach((e) => {
    html.push(`<tr>`);

    // dapatkan data dari setiap elementnya
    dataKey.forEach((el) => {
      const val = e[el];

      // number?
      if (!isNaN(val)) {
        html.push(`<td nowrap style='word-break: break-all;border: 1px solid rgb(156, 156, 156);text-align: right;'>${formatNumber(val)}</td>`);
      } else {
        // period?
        if (el == 'period') {
          html.push(`<td nowrap style='word-break: break-all;border: 1px solid rgb(156, 156, 156);'>${String(val).replace(/-/g, '')}</td>`);
        } else {
          html.push(`<td nowrap style='word-break: break-all;border: 1px solid rgb(156, 156, 156);'>${val}</td>`);
        }
      }
    });

    html.push(`</tr>`);
  });

  html.push(`</tbody>`);

  return html.join('');
}

const formatTable = (payload) => {
  const html = [];
  const _payload = JSON.parse(JSON.stringify(payload));

  // filter key
  let keys = Object.keys(_payload);
  keys = keys.filter((key) => !exclude.includes(key));

  for (let i = 0; i < keys.length; i++) {
    const reportName = keys[i];
    const data = _payload[reportName];

    // CUSTOM
    if (i == 0) html.push(`<table nowrap> <tbody>`);
    // END CUSTOM

    html.push(`<td nowrap> <table nowrap>`);

    // datanya ada?
    if (data.length > 1) {
      const thead = getTableHeader(i, reportName, data);
      const tbody = getTableData(i, data);

      html.push(thead);
      html.push(tbody);
    }

    html.push(`</table></td> `);

    // CUSTOM
    if (i == 6 || i == 11) html.push(`</table></tbody><table nowrap> <tbody>`);
    if (i == (keys.length - 1)) html.push(`</table></tbody>`);
    // END CUSTOM
  }

  return html.join('');
};

export async function formatReport(payload) {
  const table = formatTable(payload);
  return table; // `<div class='flex-container'>${table}</div>`;
}
