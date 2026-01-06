//my own version for sorting tables

var dateregex = /^(\d\d?)[\/\.-](\d\d?)[\/\.-]((\d\d)?\d\d)$/;
var sortindicators = {
  fwd: "&nbsp;&#x25BE;",
  rev: "&nbsp;&#x25B4;"
};
var sortfunctions = {
  numeric: sortnumeric,
  alpha: sortalpha,
  ddmm: sortddmm,
  mmdd: sortmmdd,
  bellrow: sortbellrow
};



//trigger with click on a th element
function tableheadclick(e) {
  let id = $(this).parents("table").attr("id");
  let col = $(this).index()+1;
  
  let sorted;
  let indicator;
  if ($(this).hasClass("sorttable_sorted")) {
    //need to change class & indicator
    sorted = "sorted";
  } else if ($(this).hasClass("sorttable_sorted_reverse")) {
    sorted = "reverse";
  }
  ["sorttable_sorted","sorttable_sorted_reverse"].forEach(c => {
    $("#"+id+" ."+c).removeClass(c);
  });
  $("#"+id+" .sortindicator").remove();
  if (sorted) {
    reversetablerows(id);
    let key = sorted === "sorted" ? "rev" : "fwd";
    $(this).append(`<span class="sortindicator">${sortindicators[key]}</span>`);
    let c = "sorttable_sorted";
    if (key === "rev") c += "_reverse";
    $(this).addClass(c);
  } else {
    let span = `<span class="sortindicator">${sortindicators.fwd}</span>`;
    $(this).append(span);
    $(this).addClass("sorttable_sorted");
    let fkey = choosesort(id, col);
    let trows = $("#"+id+" tbody tr").length;
    //console.log(fkey);
    let sortarr = [];
    let i = 1;
    while (i <= trows) {
      let row = $("#"+id+" tbody tr:nth-child(1)");
      let cell = row.children("td:nth-child("+col+")");
      let a = [getinnertext(cell), row.detach()];
      sortarr.push(a);
      i++;
    }
    //console.log(sortarr);
    sortarr.sort(sortfunctions[fkey]);
    
    sortarr.forEach(a => {
      $("#"+id+" tbody").append(a[1]);
    });
  }
}






function choosesort(tid, col) {
  let cc = $("#"+tid+" th:nth-child("+col+")").attr("class");
  if (cc) cc = cc.split(" ");
  let custom = cc ? cc.find(c => c.startsWith("sort_") && Object.keys(sortfunctions).includes(c.slice(5))) : null;
  if (custom) return custom.slice(5);
  let trows = $("#"+tid+" tbody tr").length;
  let text = "";
  let format;
  let possdate;
  let i = 1;
  while (!format && i <= trows) {
    text = getinnertext($("#"+tid+" tbody tr:nth-child("+i+")").children("td:nth-child("+col+")"));
    if (text.length) {
      possdate = text.match(dateregex);
      if (text.match(/^-?[£$€]?[\d,.]+%?$/)) {
        format = "numeric";
      } else if (possdate) {
        //distinguish different formats...
        let first = parseInt(possdate[1]);
        let second = parseInt(possdate[2]);
        if (first > 12) {
          format = "ddmm";
        } else if (second > 12) {
          format = "mmdd";
        }
        
      } else {
        format = "alpha";
      }
    }
    
    i++;
  }
  
  if (!format) {
    format = possdate ? "ddmm" : "alpha";
  }
  
  return format;
}


//much simpler than the original...
function getinnertext(cell) {
  let custom = cell.attr("sorttable_customkey");
  if (custom && custom.length) return custom;
  return cell.text();
}


  /* sort functions
     each sort function takes two parameters, a and b
     you are comparing a[0] and b[0] */
function sortnumeric(a,b) {
  let aa = parseFloat(a[0].replace(/[^0-9.-]/g,''));
  if (isNaN(aa)) aa = 0;
  let bb = parseFloat(b[0].replace(/[^0-9.-]/g,'')); 
  if (isNaN(bb)) bb = 0;
  return aa-bb;
}

function sortalpha(a,b) {
  if (a[0]==b[0]) return 0;
  if (a[0]<b[0]) return -1;
  return 1;
}

function sortbellrow(a,b) {
  let max = Math.max(a[0].length, b[0].length);
  let orig = [a[0], b[0]];
  let strs = {};
  let pp = "0ETABCD";
  let subs = "ABCDEFG";
  orig.forEach(r => {
    strs[r] = "";
    for (let i = 0; i < r.length; i++) {
      let c = r[i];
      let j = pp.indexOf(c);
      max = Math.max(max, j+10);
      let nc = j > -1 ? subs[j] : c;
      strs[r] += nc;
    }
  });
  let base = max > 9 ? max+1 : 10;
  let aa = parseInt(strs[a[0]], base);
  let bb = parseInt(strs[b[0]], base);
  return aa-bb;
}

function sortmmdd(a,b) {
  let matches = [a[0].match(dateregex), b[0].match(dateregex)];
  let dates = [];
  
  matches.forEach(mtch => {
    let d = "";
    //basically convert it to YYYY-MM-DD
    [3,1,2].forEach(i => {
      let n = mtch[i];
      if (i != 3 && n.length === 1) n = "0"+n;
      d += n;
    });
    dates.push(d);
  });
  
  if (dates[0]==dates[1]) return 0;
  if (dates[0]<dates[1]) return -1;
  return 1;
}

function sortddmm(a,b) {
  let matches = [a[0].match(dateregex), b[0].match(dateregex)];
  let dates = [];
  
  matches.forEach(mtch => {
    let d = "";
    for (let i = 3; i >= 1; i--) {
      let n = mtch[i];
      if (i != 3 && n.length === 1) n = "0"+n;
      d += n;
    }
    dates.push(d);
  });
    
  if (dates[0]==dates[1]) return 0;
  if (dates[0]<dates[1]) return -1;
  return 1;
}


//table id
function reversetablerows(tid) {
  let trows = $("#"+tid+" tbody tr").detach();
  for (let i = trows.length-1; i > -1; i--) {
    $("#"+tid+" tbody").append(trows[i]);
  }
}
