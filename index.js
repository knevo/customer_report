const onUploadFile = async (file) => {
  console.log('upload', file);
  var reader = new FileReader();
  reader.readAsText(file, 'UTF-8');
  reader.onload = async (evt) => {
    const data = await csv({ output: 'json' }).fromString(evt.target.result);
    init(data);
  };
};

const download = function (data, name) {
  const blob = new Blob([data], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var link = document.getElementById(name);
  link.setAttribute('href', url);
  link.setAttribute('download', `${name}.csv`);
  //     link.style.visibility = 'hidden';
  //     document.body.appendChild(link);
  //     link.onclick = () => {
  //       setTimeout(() => {
  //         // Delay removal
  //         document.body.removeChild(link);
  //         window.URL.revokeObjectURL(url); // Clean up URL
  //       }, 100); // Delay time in milliseconds, adjust if necessary
  //       resolve();
  //     };
  //     link.click();
  //   });
};

const jsonToCsv = (json) => {
  const replacer = (key, value) => (value === null ? '' : value);
  const header = Object.keys(json[0]);
  let csv = json.map((row) =>
    header
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(','),
  );
  csv.unshift(header.join(','));
  csv = csv.join('\r\n');
  return csv;
};

const init = async (data) => {
  data = data.filter(
    (item) =>
      !item.itemName.includes('DR.') &&
      !item.itemName.includes('SPLAT') &&
      !item.itemName.includes('MAKFA'),
  );
  const groupOrdersByOrderItemId = Object.values(
    data.reduce((acc, item) => {
      if (!acc[item.orderNumber]) acc[item.orderNumber] = [];
      acc[item.orderNumber].push(item);
      return acc;
    }, {}),
  ).reduce((acc, orders) => {
    acc.push({ ...orders[0], quantity: orders.length });
    return acc;
  }, []);

  const idToOrders = groupOrdersByOrderItemId.reduce((acc, item) => {
    if (!acc[item.customerName]) acc[item.customerName] = [];
    acc[item.customerName].push(item);
    return acc;
  }, {});

  const repeatingCustomers = Object.keys(idToOrders).reduce((acc, key) => {
    if (idToOrders[key].length > 1) {
      acc[key] = idToOrders[key];
    }
    return acc;
  }, {});
  console.log(
    'Number of repeating customers:',
    Object.keys(repeatingCustomers).length,
  );
  let res = Object.values(repeatingCustomers)
    .map((orders) => {
      return orders.map((order) => ({
        customerName: order.customerName,
        itemName: order.itemName,
        createTime: new Date(order.createTime),
        paidPrice: order.paidPrice,
        quantity: order.quantity,
      }));
    })
    .flat()
    .sort((a, b) => {
      if (a.customerName > b.customerName) {
        return 1;
      } else if (a.customerName < b.customerName) {
        return -1;
      } else {
        return a.createTime - b.createTime;
      }
    });

  const nameSet = new Set();
  const byMonth = res.reduce((acc, item) => {
    const monthName = item.createTime.toLocaleString('default', {
      month: 'long',
    });
    if (!acc[monthName]) acc[monthName] = [];
    if (!nameSet.has(item.customerName)) {
      acc[monthName].push(item.customerName);
      nameSet.add(item.customerName);
    }
    return acc;
  }, {});
  const flatByMonth = Object.keys(byMonth)
    .map((key) => ({
      month: key,
      customers: byMonth[key].length,
    }))
    .sort((a, b) => {
      const monthOrder = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });
  const resCsv = jsonToCsv(res);
  const byMonthCsv = jsonToCsv(flatByMonth);
  download(resCsv, 'repeating_customers');
  download(byMonthCsv, 'customer_growth_by_month');
  document.getElementById('output').style.display = 'flex';
};
