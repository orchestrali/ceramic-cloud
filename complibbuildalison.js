const places = "1234567890ETABCD";
const stagenames = ["Doubles","Minor","Triples","Major","Caters","Royal", "Cinques","Maximus","Sextuples","Fourteen","Septuples","Sixteen"];
//complib api url for getting methods & compositions
var url = "https://api.complib.org/";
const tableheads = ["Mask", "Description", "Category", "Type", "Stroke", "Possible", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"];
var schemerules = [];
var categorynames = [];
var categorystages = {};
var categorystats = [];






$(function() {
  buildinitialtables();
  buildinitialrules();

  $("#downloadcsv").on("click", downloadfile);
  $("#categorytable").on("change", ".cposition", movecategory);

  $("#showabout").on("click", () => $("#aboutpanel").toggle());
  $("#showinstruct").on("click", () => $("#instructions").toggle());
  $("#closeinstruct").on("click", () => $("#instructions").hide());
  
  $("#addpattern").on("click", addschemerule);
  $("#patternentry").on("keydown", patternkeydown);
  
  $("#viewcomp").on("click", viewcomp);
  $("#compliburl").on("click", () => $("#complibinfo").text(""));
  $("#reporttable").on("click", ".reportcat", reportcatclick);
});



// *** actions ***

//clear error info
function patternkeydown() {
  $("#addinginfo").text("");
}

function stageclick(e) {
  $(e.currentTarget).next().toggle();
}

function removerowclick(e) {
  let tr = $(e.currentTarget).parent("tr");
  let id = tr.parents(".stagescheme").attr("id");
  let stage = Number(id.slice(5));
  let cat = tr.children("td:nth-child(3)").text();
  //console.log(cat, stage);
  checkcategory(cat, stage);
  tr.remove();
}

function removestagerules(e) {
  let stage = Number(e.currentTarget.id.slice(5));
  //remove table rows
  $("#stage"+stage+" tbody tr").remove();
  //remove saved rules
  let o = schemerules.find(obj => obj.stage === stage);
  o.rules = [];
  let removecats = [];
  categorynames.forEach((n,j) => {
    let i = categorystages[n].indexOf(stage);
    if (i > -1) {
      categorystages[n].splice(i,1);
    }
    if (categorystages[n].length === 0) removecats.push(j);
  });
  if (removecats.length) {
    for (let i = removecats.length-1; i > -1; i--) {
      categorynames.splice(removecats[i], 1);
    }
    buildcattable();
  } else {
    let tdi = stage-2;
    $("#categorytable tbody td:nth-child("+tdi+")").text("");
  }
}

function viewcomp() {
  //clear previous
  $("h3").text("");
  $("#totals").text("");
  $("#comptable tbody,#reporttable tbody").contents().remove();
  $("#compdisplay").hide();
  
  let compliburl = $("#compliburl").val();
  let problem;
  let complibid, comptype, accesskey;
  if (compliburl.startsWith("https://complib.org/")) {
    compliburl = compliburl.slice(20);
    
    if (compliburl.startsWith("method/")) {
      comptype = "method";
    } else if (compliburl.startsWith("composition/")) {
      comptype = "composition";
    }
    if (comptype) {
      let i = comptype.length+1;
      compliburl = compliburl.slice(i);
      let q = compliburl.indexOf("?");
      let j = q > -1 ? q : compliburl.length;
      let id = compliburl.slice(0, j);
      if (/^\d+$/.test(id)) {
        complibid = id;
        if (q > -1 && compliburl[q+1]) {
          let query = compliburl.slice(q+1).split("&");
          accesskey = query.find(s => s.startsWith("accessKey="));
        }
        //[complibid, comptype, accesskey].forEach(v => console.log(v));
        getcomplib(complibid, comptype, accesskey);
      } else {
        problem = "id should be all numbers";
      }
    } else {
      problem = "not method or composition";
    }
  } else {
    problem = "incorrect url";
  }
  
  if (problem) {
    //display something??
    $("#complibinfo").text("problem with link");
  }
}

function reportcatclick(e) {
  let c = e.currentTarget.id.slice(6);
  $("."+c).toggle();
}

//trying version without waiting for confirmation
function movecategory(e) {
  //let npos = Number($(e.currentTarget).prevAll("select").children("option:checked").text());
  let npos = Number($(e.currentTarget).children("option:checked").text());
  let ni = npos-1;
  let oi = $(e.currentTarget).parent().parent().index();
  let test = $(e.currentTarget).parent().next().text();
  let cat = categorynames[oi];
  if (test != cat) {
    //problem or I did something wrong
    console.log(test);
    console.log(cat);
  } else {
    categorynames.splice(oi, 1);
    categorynames.splice(ni, 0, cat);
    buildcattable();
  }
  
}


// ******* main purpose of this website *******

function addschemerule() {
  let stage = Number($("#stage option:checked").val());
  let rounds = places.slice(0, stage);
  let chars = rounds + "x()";
  let pattern = $("#patternentry").val();
  let p = replacebellletters(pattern);
  let set = [p];
  if (p.includes("(")) set = handlepatterns(p);
  let parr = p.split("");
  if (parr.some(c => !chars.includes(c)) || set.length === 0) {
    //invalid pattern
    $("#addinginfo").text("pattern not valid");
  } else if (pattern.length) {
    let o = {
      pattern: pattern,
      locations: "",
      points: Number($("#points").val())
    };
    let descript = $("#patterndescript").val();
    if (descript.length) o.description = descript;
    let ocat = $("#patterncat").val();
    if (ocat.length) {
      o.category = ocat;
      //category is added to categorynames in convertrule
    }
    ["front","middle","back"].forEach(w => {
      if ($("#"+w).is(":checked")) {
        o.locations += w[0];
      }
    });
    let stroke = $("#stroke option:checked").text();
    if (stroke != "Any") o.stroke = stroke;
    if ($("#transpose").is(":checked")) o.transpose = true;
    
    let set = schemerules.find(obj => obj.stage === stage);
    set.rules.push(o);
    
    //add to the actual table
    let tablerows = convertrule(o, stage);
    tablerows.forEach(tr => {
      let html = buildtablerow(tr, stage);
      $("#stage"+stage+" tbody").append(html);
    });
    //table no longer sorted
    ["sorttable_sorted","sorttable_sorted_reverse"].forEach(c => {
      $("#stage"+stage+" th."+c).removeClass(c);
    });
    //inform user
    $("#patternentry").val("");
    $("#addinginfo").text("Added!");
    setTimeout(() => {
      $("#addinginfo").text("");
    }, 1000);
  }
  
}


//convert one of my "rules" to complib spreadsheet rows
function convertrule(r, stage) {
  let tablerows = [];
  if (!categorynames.includes(r.category)) {
    addcategory(r.category, stage);
  } else {
    checkcategory(r.category, stage, true);
  }
  let set = [];
  let p = r.pattern;
  //pattern has parentheses
  if (p.includes("(")) {
    //expand to multiple rows
    let pp = handlepatterns(p);
    pp.forEach(pat => {
      let o = {pattern: pat};
      for (let key in r) {
        if (key != "pattern") o[key] = r[key];
      }
      set.push(o);
    });
  } else {
    set.push(r);
  }
  //pattern transpositions
  if (r.transpose) {
    //expand to multiple rows
    //could already be working with multiple rows from parentheses
    set.forEach(o => {
      let tt = transposepattern(o.pattern, stage);
      //help with sorting later
      let group = "stage"+places[stage-1]+"group"+tt[0];
      tt.forEach(t => {
        let tr = {pattern: t, group: group};
        for (let key in o) {
          if (key != "pattern") tr[key] = o[key];
        }
        tablerows.push(tr);
      });
    });
  } else {
    tablerows.push(...set);
  }
  return tablerows;
}

//r is an object with the info needed for a single table row
function buildtablerow(r, stage, num) {
  let p = r.pattern;
  let cols = [p, p];
  let numbers = [];
  /*
  if (r.description) {
    cols.push(r.description);
  } else {
    cols.push(p+"s");
  }
  */
  cols.push(r.category || "");
  //type
  cols.push(p.length === stage ? "Row" : "Mask");
  //stroke
  cols.push(r.stroke || "Any");
  //possible
  let possible;
  if (p.length === stage) {
    let x = p.split("").filter(c => c === "x");
    possible = x.length === 0 ? 1 : factorial(x.length);
  } else {
    let others = stage-p.length;
    possible = 0;
    if (r.locations.includes("f")) {
      possible += factorial(others);
    }
    if (r.locations.includes("b")) {
      possible += factorial(others);
    }
    if (r.locations.includes("m")) {
      let f = others-1;
      possible += factorial(others)*f;
    }
  }
  numbers.push(possible);
  if (possible > 1) cols[1] += "[s]";
  if (r.description) cols[1] += " "+r.description;
  //scores
  if (r.locations.length === 3 || p.length === stage) {
    numbers.push(r.points, 0, 0, 0);
  } else {
    numbers.push(0);
    ["f", "m", "b"].forEach(c => {
      numbers.push(r.locations.includes(c) ? r.points : 0);
    });
  }
  // id="stage${stage}-${num}"
  let c = r.group ? ` class="${r.group}"` : "";
  //actually turn cols into a table row
  let html = `<tr${c}><td>`+cols.join("</td><td>")+`</td><td class="number">`+numbers.join(`</td><td class="number">`)+`</td><td class="remove">x</td></tr>`;
  return html;
  //or just return cols?
}




// **** applying the scheme ****


//row is an actual bell row
//pattern may be: actual row or row with x's
//both strings!!
//returns places in the row (1-indexed) where the pattern occurs
function testrow(row, pattern) {
  if (row.includes(pattern)) {
    //this should now only happen for whole row matches...
    let start = row.indexOf(pattern);
    let pp = places.slice(start, start+pattern.length).split("").map(bellnum);
    return pp;
  }
  if (row.length === pattern.length && pattern.includes("x")) {
    let match = true;
    let i = 0;
    let pp = [];
    while (match && i < row.length) {
      match = pattern[i] === "x" || row[i] === pattern[i];
      if (row[i] === pattern[i]) pp.push(i+1);
      i++;
    }
    return match ? pp : [];
  }
  return [];
}


function buildcomptablerow(rn, row, pp, points, cat) {
  let tr = `<tr><td>${rn}</td><td class="row">`;
  let span;
  for (let i = 1; i <= row.length; i++) {
    if (pp.includes(i)) {
      if (!span) tr += `<span class="green">`;
      span = true;
    } else {
      if (span) tr += `</span>`;
      span = false;
    }
    tr += row[i-1];
  }
  if (span) tr += `</span>`;
  
  tr += `</td><td>${points}</td><td>${pp.length}</td><td>${cat}</td></tr>`;
  return tr;
}

//rows of a method or composition, obtained from complib
function displaycomp(rows, stage) {
  let patterns = buildstagepatterns2(stage);
  let count = 0;
  let totalpoints = 0;
  let report = {
    Category: {},
    Description: {}
  };
  let catpoints = {};
  for (let i = 2; i < rows.length; i++) {
    let row = rows[i][0];
    let pp = [];
    let points = 0;
    let cat = "";
    //some rows can match multiple categories; collect them all
    let cats = [];
    patterns.forEach(obj => {
      //stroke of composition row: 0 for handstroke, 1 for backstroke
      let rowstroke = i%2;
      //stroke at which pattern gets points
      let pstroke = obj.Stroke === "Handstroke" ? 0 : obj.Stroke === "Backstroke" ? 1 : i%2;
      //only test pattern if stroke is correct
      if (pstroke === rowstroke) {
        let pl = testrow(row, obj.Mask);
        
        if (pl.length && obj.points) {
          cats.push({cat: obj.Category, numplaces: pl.length});
          points += obj.points;
          pl.forEach(n => {
            if (!pp.includes(n)) pp.push(n);
          });
        }
        if (pl.length) {
          //count things even if they don't get points
          ["Category","Description"].forEach(w => {
            let o = report[w][obj[w]];
            if (o) {
              o.Score += obj.points;
              o.Count++;
              if (obj.loc != "whole") o[obj.loc]++;
            } else {
              o = {
                Score: obj.points,
                Count: 1
              };
              if (obj.loc != "whole") {
                o.parts = true;
                ["Front","Internal","Back"].forEach(loc => o[loc] = 0);
                o[obj.loc]++;
              }
              if (w === "Category") o.descripts = [obj.Description];
              report[w][obj[w]] = o;
            }
          });
          let catdesc = report.Category[obj.Category].descripts;
          if (!catdesc.includes(obj.Description)) {
            catdesc.push(obj.Description);
          }
        }
      }
    });
    if (points) {
      if (cats.length) {
        cats.sort((a,b) => b.numplaces-a.numplaces);
        cat = cats[0].cat;
        if (catpoints[cat]) {
          catpoints[cat] += points;
        } else {
          catpoints[cat] = points;
        }
      }
      pp.sort((a,b) => a-b);
      count++;
      totalpoints += points;
    }
    //brackets for plurals
    let cattext = handleplural(cat);
    //add the comprow to the table
    let tr = buildcomptablerow(i-1, row, pp, points, cattext);
    $("#comptable tbody").append(tr);
  }
  //table no longer sorted
  ["sorttable_sorted","sorttable_sorted_reverse"].forEach(c => {
    $("#comptable th."+c).removeClass(c);
  });
  //console.log("total points: "+totalpoints);
  //console.log(catpoints);
  //console.log(report);
  buildcompreport(report);
  let totaltext = `${count} rows with points, ${totalpoints} points in total`;
  $("#totals").text(totaltext);
  $("#compdisplay").show();
}


function buildreportrow(name, o) {
  let cols = [handleplural(name, true)];
  if (o.parts) {
    ["Front","Internal","Back"].forEach(w => {
      cols.push(o[w]);
    });
  } else {
    cols.push("", "", "");
  }
  cols.push(o.Count, o.Score);
  return cols;
}

/*
report object:
{
  Category: {
    "[category name]": {
      possible keys: Score, Count, Front, Internal, Back, parts (boolean), descripts
    }
  },
  Description: {}
}
*/
function buildcompreport(report) {
  
  let i = 1;
  //go in categorynames order
  categorynames.forEach(cat => {
    if (report.Category[cat]) {
      let o = report.Category[cat];
      let cols = buildreportrow(cat, o);

      let tr = `<tr id="reportcat${i}" class="reportcat"><td>` + cols.join(`</td><td>`) + `</td></tr>`;
      //add the table row
      $("#reporttable tbody").append(tr);
      
      let descripts = descriptionsort(o.descripts);

      descripts.forEach(desc => {
        let d = report.Description[desc];
        let cells = buildreportrow(desc, d);
        let row = `<tr class="subcat cat${i}"><td>` + cells.join(`</td><td>`) + `</td></tr>`;
        $("#reporttable tbody").append(row);
      });

      i++;
    }
  });
  
}

//input is already descriptions in the same category
//array of strings
function descriptionsort(descripts) {
  //slice to have just the row/segment
  let arr = [];
  let hasx = [];
  descripts.forEach(d => {
    let i = d.indexOf("[");
    if (i === -1) i = d.indexOf(" ");
    let s = i > -1 ? d.slice(0,i) : d;
    let o = {
      description: d,
      segment: s
    };
    if (s.includes("x")) {
      hasx.push(o);
    } else {
      let a = s.split("").map(bellnum);
      let min = Math.min(...a);
      let diff = 1-min;
      let r = a.map(n => n+diff);
      o.normal = rowstring(r);
      arr.push(o);
    }
  });
  //create "normal" forms????
  
  arr.sort((a,b) => {
    let normal = bellrowsort(a.normal, b.normal);
    return normal === 0 ? bellrowsort(a.segment, b.segment) : normal;
  });
  
  let res = arr.concat(hasx);
  return res.map(o => o.description);
}



//complib id, type method or composition
function getcomplib(id, type, access) {
  var xhr = new XMLHttpRequest();
  let path = url+type+"/"+id+"/rows";
  if (access && access.length) path += "?" + access;
  
  xhr.open('GET', path, true);
  xhr.send();

  xhr.onload = function() {
    $("#loading").hide();
    let results = JSON.parse(xhr.responseText);

    if (results.rows) {
      $("h3").text(results.title);
      let stage = results.stage;
      let rows = results.rows;
      if (rows[rows.length-3][1] === "That's all at handstroke") rows.pop();
      displaycomp(rows, stage);
    } else {
      //something is wrong?
      console.log(results);
      let text;
      if (xhr.status === 401) {
        text = "That appears to be a private "+type+". If that is what you want, look for the share link.";
      } else {
        text = type + " not found";
      }
      $("#complibinfo").text(text);
    }
  }

  xhr.onerror = function() {
    $("#loading").hide();
    let text = "Error retrieving "+type;
    
    $("#complibinfo").text(text);
  }
}












// **** downloading csv version ****

function buildcsv() {
  //probably rebuild summaries first??
  categorysummarize();
  //actually should probably do those tasks here to avoid repeatedly getting the table rows
  
  let header = ["Id", "SchemeId", "Stage", "Sequence", "Mask", "Description", "Summarise", "Type", "Stroke", "Possible", "Minimum", "Maximum", "Factor", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].join(",");
  
  let texts = {
    odd: ``,
    even: `
`
  };
  let ids = {odd: 1001, even: 1}
  
  for (let stage = 5; stage <= 16; stage++) {
    let odd = stage % 2 === 1;
    let idkey = odd ? "odd" : "even";
    let catobj = categorystats.find(o => o.stage === stage);
    if (catobj) {
      catobj.categories.forEach((o,i) => {
        let list = o.seqids.map(n => Number(n));
        let lstring = '"'+o.seqids[0];
        let current = [];
        
        for (let j = 1; j < list.length; j++) {
          if (list[j]-list[j-1] === 1) {
            current.push(j);
          } else {
            if (current.length) lstring += "-" + o.seqids[j-1];
            lstring += "," + o.seqids[j];
            current = [];
          }
        }
        if (current.length) lstring += "-" + o.seqids[current[current.length-1]];
        lstring += '"';
        //'"'+ o.seqids.join(",") +'"'
        //ids[idkey]
        //leaving Id column blank; can just be automatically numbered in the spreadsheet
        let row = ["", "", stage, i+1, lstring, o.name, "0", "Subtotal", "Any", "0","0","0","0","0","0","0","0"];
        texts[idkey] += row.join(",") + `
`;
        ids[idkey]++;
      });
    }
    
    let rows = gettablerows(stage);
    rows.forEach((r,i) => {
      let row = ["", "", stage, r.seq, r.Mask, r.Description, "0", r.Type, r.Stroke, r.Possible, "0", "", "1", r.Score, r.ScoreFront, r.ScoreInternal, r.ScoreBack];
      texts[idkey] += row.join(",") + `
`;
      ids[idkey]++;
    });
  }
  let full = header + texts.even + texts.odd;
  return full;
}


function downloadfile() {
  let file = buildcsv();
  
  const a = document.createElement('a');
  const blob = new Blob([file], {type: "text/plain"});
  a.href = URL.createObjectURL(blob);
  a.download = "my-complib-tests.csv";
  a.click();
  
  URL.revokeObjectURL(a.href);
}






// **** processing scheme rows ****

function gettablerows(stage) {
  let oo = [];
  let num = $("#stage"+stage+" tbody tr").length;
  for (let i = 1; i <= num; i++) {
    let tr = $("#stage"+stage+" tbody tr:nth-child("+i+")");
    let c = tr.attr("class");
    let obj = {};
    //seq: (i+99).toString()
    if (c) obj.group = c.slice(11);
    for (let j = 0; j < tableheads.length; j++) {
      obj[tableheads[j]] = tr.children("td:nth-child("+(j+1)+")").text();
    }
    oo.push(obj);
  };
  //if building csv, should sort objects by category then mask, and assign sequence numbers after
  oo.sort(tablerowsort);
  for (let i = 0; i < oo.length; i++) {
    oo[i].seq = (i+100).toString();
  }
  return oo;
}

function tablerowsort(a, b) {
  let ii = [];
  [a,b].forEach(o => ii.push(categorynames.indexOf(o.Category)));
  if (ii[0] != ii[1]) {
    return ii[0]-ii[1];
  }
  if (ii[0] === ii[1]) {
    return normalrowsort(a.Mask, b.Mask);
  }
}

var stagecount;
function performcount(stage) {
  let rows = gettablerows(stage);
  
  let ref = reformat(rows, stage);
  let sinfo = countrows(ref.map(o => o.Mask));
  stagecount = {stage: stage, sharedquantity: sinfo.sharedrows.length, totalrows: sinfo.total, categories: []};
  categorynames.forEach(cn => {
    let catrows = rows.filter(o => o.Category === cn);
    if (catrows.length) {
      let cat = {
        name: cn,
        numrows: catrows.length,
        totalpoints: 0
      };
      catrows.forEach(r => {
        let numbers = [];
        ["Possible", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].forEach(w => numbers.push(Number(r[w])));
        if (numbers[1]) {
          cat.totalpoints += numbers[0]*numbers[1];
        } else {
          let total = Math.max(...numbers.slice(2))*numbers[0];
          cat.totalpoints += total;
        }
      });
      
      let arr = reformat(catrows, stage);
      let info = countrows(arr.map(o => o.Mask));
      cat.totalrows = info.total;
      cat.sharedcount = info.sharedrows.length;
      stagecount.categories.push(cat);
    }
  });
  return "done";
}

var countholder = [];
function categorysummarize() {
  console.log("summarizing");
  categorystats = [];
  for (let stage = 5; stage <= 16; stage++) {
    let res = {
      stage: stage
    };
    let rows = gettablerows(stage);
    //sort the table rows here? and apply sequence numbers?
    //no that won't work, because building the csv fetches the table rows again!
    if (stage < 13) {
      let ref = reformat(rows, stage);
      let sinfo = countrows(ref.map(o => o.Mask));
      res.totalrows = sinfo.total;
      res.sharedquantity = sinfo.sharedrows.length;
    }
    
    let cats = [];
    
    categorynames.forEach(cn => {
      let catrows = rows.filter(o => o.Category === cn);
      if (catrows.length) {
        let cat = {
          name: cn,
          seqids: catrows.map(o => o.seq),
          totalpoints: 0
        };
        catrows.forEach(r => {
          let numbers = [];
          ["Possible", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].forEach(w => numbers.push(Number(r[w])));
          if (numbers[1]) {
            cat.totalpoints += numbers[0]*numbers[1];
          } else {
            let total = Math.max(...numbers.slice(2))*numbers[0];
            cat.totalpoints += total;
          }
        });
        //eventually figure out how to count bell rows in the category
        if (stage < 13) {
          let arr = reformat(catrows, stage);
          let info = countrows(arr.map(o => o.Mask));
          //countholder.push({stage: stage, cat: cn, sharedrows: info.sharedrows, totalrows: info.total});
          //if (stage === 8 && cn === "4-bell run[s]") console.log(info);
          cat.uniquerows = info.total;
          cat.sharedquantity = info.sharedrows.length;
        }
        cats.push(cat);
      }
    });
    //cats are already sorted by categorynames order
    res.categories = cats;
    res.maxpoints = 0;
    cats.map(o => o.totalpoints).forEach(n => res.maxpoints += n);
    categorystats.push(res);
  }
}

//input table rows
//returned objects have Mask, loc, points
function reformat(trr, stage) {
  let oo = [];
  trr.forEach(tr => {
    let pp = partialpatterns(tr, stage);
    pp.forEach(p => {
      if (p.points) {
        oo.push(p);
      }
    });
  });
  return oo;
}

//input is array of strings
function countrows(pp) {
  pp.sort((a,b) => {
    let arr = [a,b].map(countx);
    return arr[0]-arr[1];
  });
  
  let extra = [];
  let nooverlap = [];
  let overlaps = [];
  let hasoverlap = [];
  for (let i = 0; i < pp.length-1; i++) {
    let r = pp[i];
    let j = pp.length-1;
    let matches = [];
    let contain;
    let match;
    while (!contain && j > i) {
      match = buildoverlap(r, pp[j]);
      contain = [r,pp[j]].includes(match);
      if (match && !contain) {
        matches.push({overlap: match, sources: [r, pp[j]]});
      }
      j--;
    }
    if (match === r) {
      extra.push(r);
    } else if (match === pp[j+1]) {
      extra.push(pp[j+1]);
    } else if (matches.length) {
      matches.forEach(o => {
        let ov = overlaps.find(obj => obj.overlap === o.overlap);
        o.sources.forEach(s => {
          if (ov) {
            if (!ov.sources.includes(s)) ov.sources.push(s);
          }
          if (!hasoverlap.includes(s)) hasoverlap.push(s);
        });
        if (!ov) {
          overlaps.push(o);
        }
      });
    } else {
      if (!hasoverlap.includes(r)) nooverlap.push(r);
    }
  }
  let last = pp[pp.length-1];
  if (!extra.includes(last) && !hasoverlap.includes(last)) {
    nooverlap.push(last);
  }
  
  //console.log(nooverlap);
  
  
  let sharedrows = [];
  let uniquecounts = [];
  hasoverlap.forEach(p => {
    let shared = [];
    let oo = overlaps.filter(o => o.sources.includes(p));
    let num = countx(p);
    let total = factorial(num);
    oo.forEach(o => {
      let rows = getrowsfrompattern(o.overlap);
      rows.forEach(r => {
        if (!shared.includes(r)) shared.push(r);
      });
    });
    let unique = total-shared.length;
    uniquecounts.push(unique);
    shared.forEach(r => {
      if (!sharedrows.includes(r)) sharedrows.push(r);
    });
  });
  
  //console.log(sharedrows);
  //console.log(uniquecounts);
  
  let total = sharedrows.length;
  for (let i = 0; i < nooverlap.length; i++) {
    let o = nooverlap[i];
    let num = countx(o);
    let count = num ? factorial(num) : 1;
    total += count;
  }
  uniquecounts.forEach(n => total += n);
  //console.log(total);
  
  return {nooverlap: nooverlap, sharedrows: sharedrows, total: total};
}


//doesn't have to be related to categories
//take a table row and produce separate patterns if front, internal, and back aren't all checked
function catrowpatterns(catrow, stage) {
  let pattern = catrow.Mask;
  let partscores = ["ScoreFront", "ScoreInternal", "ScoreBack"].map(w => catrow[w]);
  let pp = [];
  if (pattern.length === stage || !partscores.includes("0")) {
    pp.push(pattern);
  } else {
    let x = "xxxxxxxxxxxxxxxxxxxxxxxxx".slice(0, stage-pattern.length);
    if (partscores[0] != "0") {
      pp.push(pattern+x);
    }
    if (partscores[2] != "0") {
      pp.push(x+pattern);
    }
    if (partscores[1] != "0") {
      for (let i = 1; i < x.length; i++) {
        let p = x.slice(0,i) + pattern + x.slice(i);
        pp.push(p);
      }
    }
  }
  return pp;
}

//build front, internal, and back even if they don't get points, because they'll still be counted
function partialpatterns(tablerow, stage) {
  let pattern = tablerow.Mask;
  let pp = [];
  let num = Number(tablerow.Score);
  if (tablerow.Type === "Row") {
    pp.push({Mask: pattern, loc: "whole", points: num});
  } else {
    let x = "xxxxxxxxxxxxxxxxxxxxxxxxx".slice(0, stage-pattern.length);
    let partscores;
    if (num === 0) {
      partscores = ["ScoreFront", "ScoreInternal", "ScoreBack"].map(w => Number(tablerow[w]));
    } else {
      partscores = [num, num, num];
    }
    pp.push({Mask: pattern+x, loc: "Front", points: partscores[0]});
    pp.push({Mask: x+pattern, loc: "Back", points: partscores[2]});
    for (let i = 1; i < x.length; i++) {
      let p = x.slice(0,i) + pattern + x.slice(i);
      pp.push({Mask: p, loc: "Internal", points: partscores[1]});
    }
  }
  return pp;
}

//returned patterns now have "points" and "loc"
function buildstagepatterns2(stage) {
  let trr = gettablerows(stage);
  let patterns = [];
  trr.forEach(tr => {
    let oo = partialpatterns(tr, stage);
    oo.forEach(o => {
      for (let key in tr) {
        if (key != "Mask") o[key] = tr[key];
      }
      patterns.push(o);
    });
  });
  return patterns;
}

//convert so that each test/mask/pattern/whatever only has one "points" field
function buildstagepatterns(stage) {
  let trr = gettablerows(stage);
  let patterns = [];
  trr.forEach(tr => {
    let pp = catrowpatterns(tr, stage);
    pp.forEach(p => {
      let o = {
        Mask: p
      };
      let numbers = ["Score", "ScoreFront", "ScoreInternal", "ScoreBack"].map(w => Number(tr[w]));
      o.points = Math.max(...numbers);
      for (let key in tr) {
        if (!["Mask", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].includes(key)) {
          o[key] = tr[key];
        }
      }
      patterns.push(o);
    });
  });
  return patterns;
}




// **** category table stuff ****

function addcategory(name, stage) {
  let pos = categorynames.indexOf(name);
  if (pos === -1) {
    pos = categorynames.length;
    categorynames.push(name);
    categorystages[name] = [stage];
    $(".cposition").append(`<option>${(pos+1)}</option>`);
  }
  
  let position = `<select class="cposition">
  `;
  for (let i = 1; i <= categorynames.length; i++) {
    let s = i === pos+1 ? " selected" : "";
    position += `<option${s}>${i}</option>
    `;
  }
  position += `</select>`;
  let tr = `<tr><td>${position}</td><td>${name}</td>`;
  for (let s = 5; s <= 16; s++) {
    tr += `<td>`;
    if (categorystages[name].includes(s)) tr += "✓";
    tr += `</td>`;
  }
  //remove button? more work for me
  tr += `</tr>`;
  $("#categorytable tbody").append(tr);
}

function buildcattable() {
  $("#categorytable tbody tr").remove();
  categorynames.forEach(n => addcategory(n));
}


function checkcategory(name, stage, include) {
  if (include) {
    if (!categorystages[name].includes(stage)) {
      let tri = categorynames.indexOf(name)+1;
      let tdi = stage-2;
      $(`#categorytable tbody tr:nth-child(${tri}) td:nth-child(${tdi})`).text("✓");
      categorystages[name].push(stage);
    }
  } else {
    let oo = gettablerows(stage).map(o => o.Category);
    if (!oo.includes(name)) {
      let arr = categorystages[name];
      let i = arr.indexOf(stage);
      arr.splice(i, 1);
      let j = categorynames.indexOf(name);
      if (arr.length === 0) {
        categorynames.splice(j, 1);
        buildcattable();
      } else {
        let tri = j+1;
        let tdi = stage-2;
        $(`#categorytable tbody tr:nth-child(${tri}) td:nth-child(${tdi})`).text("");
      }
    }
  }
  
}




// **** INITIAL SETUP ****

//builds some of my stuff
function buildinitialrules() {
  console.log("building rules, my version");
  let strs = ["1234","4321"];
  let queens = {Queens: [], Kings: [], Princes: []};
  let arpeggios = {queens: "13579EAC", kings: "CAE97531", standard: "1468"};
  let tittums = {"Tittums": ["142536","15263748","1627384950","172839405E6T","1829304E5T6A7B"], "Exploded": ["342516","45362718","5647382910","675849302E1T","7869504E3T2A1B"], explodedends: [], explodedx: [], explodedxends: [], revtittums: []};
  let tittumsagain = {exploded: [], explodedx: []};
  
  
  for (let s = 5; s <= 16; s++) {
    let set = {
      stage: s,
      rules: []
    };
    let rounds = places.slice(0,s);
    let backrounds = rounds.split("").reverse().join("");
    set.rules.push({pattern: rounds, locations: "fmb", points: 1, description: "(Rounds)", category: "Run-based whole row[s]"});
    set.rules.push({pattern: backrounds, locations: "fmb", points: 1, description: "(Backrounds)", category: "Run-based whole row[s]"});
    let longruns = buildlongruns(s);
    let roundsnear = buildnearmisses(rounds);
    let backnear = buildnearmisses(backrounds);
    let misplaced = buildmisplacedtreble(s);
    let descripts = ["(Rounds near miss)", "(Backrounds near miss)", "(misplaced treble)", "("+(stage-1)+"-bell run)", "("+(stage-2)+"-bell run)"];
    let arrarr = [roundsnear, backnear, misplaced, longruns.one];
    if (stage > 5) arrarr.push(longruns.two);
    arrarr.forEach((arr,i) => {
      let des = descripts[i];
      arr.forEach(r => {
        let o = {
          pattern: r,
          locations: "fmb",
          points: 1,
          description: des,
          category: "Run-based whole row[s]"
        };
        set.rules.push(o);
      });
    });
    
    
    strs.filter(p => p.length < stage-2).forEach(p => {
      let o = {
        pattern: p,
        locations: "fb",
        points: 1,
        description: "("+p.length+"-bell run[s])",
        transpose: true
      };
      o.category = p.length <= s/2 ? "Short run[s]" : "Long run[s]";
      set.rules.push(o);
    });
    
    strs.push(rounds, backrounds);
    //finished with runs
    
    //step based.........
    let stepwhole = buildstepwhole(s);
    for (let key in stepwhole) {
      let o = {
        pattern: stepwhole[key],
        locations: "fmb",
        points: 2,
        description: "("+key+")",
        category: "Step-based whole row[s]"
      };
      set.rules.push(o);
    }
    //need to do the step-based endings...
    let actstage = s%2 === 1 ? s+1 : s;
    if (s > 6) {
      let stependings = buildstepends(actstage);
      for (let key in stependings) {
        let arr = stependings[key];
        if (s%2 === 1) {
          let tenor = places[s];
          arr = arr.filter(p => p.endsWith(tenor)).map(p => p.slice(0,-1));
        }
        arr.forEach(p => {
          let o = {
            pattern: p,
            locations: "fmb",
            points: key.startsWith("Two") ? 2 : 1,
            description: "("+key+")",
            category: "Step-based pattern[s]"
          };
          set.rules.push(o);
        });
      }
    }
    
    //queensy stuff
    let queensy = buildqueens(s);
    for (let name in queensy) {
      let o = {
        pattern: queensy[name],
        locations: "fmb",
        points: 2,
        description: "("+name+")",
        category: "Queensy whole row[s]"
      };
      set.rules.push(o);
      
      if (queens[name]) {
        queens[name].forEach(p => {
          let rule = {
            pattern: p,
            locations: p.length > s-3 ? "fmb" : "fb",
            points: (p.length-2)/2,
            description: "("+name+" on "+p.length+")",
            category: "Queensy smaller version[s]",
            transpose: true
          };
          set.rules.push(rule);
        });
      }
      if (s%2 === 0 && queens[name]) queens[name].push(queensy[name]);
    }
    if (s > 6) {
      let limit = Math.ceil(s/2);
      for (let l = 4; l <= limit; l++) {
        let q = {
          pattern: arpeggios.queens.slice(0,l),
          locations: "fb",
          points: 1,
          description: "(from Queens)",
          category: "Queensy arpeggio[s]",
          transpose: true
        };
        let k = {
          pattern: arpeggios.kings.slice(-l),
          locations: "fb",
          points: 1,
          description: "(from Kings)",
          category: "Queensy arpeggio[s]",
          transpose: true
        };
        set.rules.push(q, k);
      }
    }
    if (s > 7) {
      let o = {
        pattern: arpeggios.standard,
        locations: "fb",
        points: 1,
        description: "(standard arpeggio)",
        category: "Queensy arpeggio[s]",
        transpose: true
      };
      set.rules.push(o);
    }
    
    
    //tittumsy stuff
    let tittumsy = buildtittums(s);
    for (let name in tittumsy) {
      let o = {
        pattern: tittumsy[name],
        locations: "fmb",
        points: 1,
        description: "("+name+")",
        category: "Tittumsy whole row[s]"
      };
      set.rules.push(o);
    }
    
    
    
    //other sizes of tittums
    let tittumsysegments = [];
    let tlimit = 5;
    switch (s) {
      case 5: case 6:
        tlimit = 0;
        break;
      case 7:
        tlimit = 1;
      case 8: case 9:
        tlimit = 3;
    }
    for (let i = 0; i < tlimit; i++) {
      let actstage = s%2 === 1 ? s+1 : s;
      let tt = tittums.Tittums[i];
      let tstage = tt.length;
      let max = actstage - (tstage-actstage);
      if (tstage < s) max = tstage;
      let segs = buildshortersegments(tt, 6, max, 2, true);
      segs.forEach(seg => {
        let parts = ["Tittums"];
        if (seg.length < tstage) parts.unshift("from");
        if (tstage != actstage) parts.push("on "+tstage);
        let o = {
          pattern: seg,
          description: parts.join(" ")
        };
        tittumsysegments.push(o);
      });
    }
    if (s%2 === 0 && s > 6) {
      let segs = buildshortersegments(tittumsy["Exploded Tittums"], 6, s-2, 2, false);
      tittumsagain.exploded.push(...segs);
    }
    tittumsagain.exploded.forEach(seg => {
      tittumsysegments.push({pattern: seg, description: "(from Exploded Tittums)"});
    });
    
    tittumsysegments.forEach(o => {
      o.locations = "fb";
      o.points = 2;
      o.category = "Tittumsy smaller version[s]";
      o.transpose = true;
      set.rules.push(o);
    });
    
    tittumsagain.exploded.push(tittumsy["Exploded Tittums"]);
    
    schemerules.push(set);
    
    
    
  }

  buildinitialtablebodies();
}

function buildinitialtables() {
  for (let s = 5; s <= 16; s++) {
    $("#categorytable thead tr").append(`<th>${s}</th>`);
    let name = stagenames[s-5];
    let html = `<div class="stagescheme" id="stage${s}">
      <p>${name}</p>
      <div class="tcontainer">
        <button class="clearrows" id="clear${s}" type="button">Delete all</button>
      </div>
    </div>`;
    $("#schemetables").append(html);
  }
  let table = `<table>
        <thead>
          <tr>
          <th class="row">Mask</th>
          <th class="wide">Description</th>
          <th>${tableheads.slice(2).join("</th><th>")}</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </table>`;
  $(".tcontainer").append(table);
  $(".stagescheme p").on("click", stageclick);
  $("table").on("click", ".remove", removerowclick);
  $(".clearrows").on("click", removestagerules);
}

function buildinitialtablebodies() {
  for (let s = 5; s <= 16; s++) {
    buildschemetable(s);
  }
  $("#downloadcsv").show();
  categorysummarize();
}

function buildschemetable(stage) {
  let list = schemerules.find(o => o.stage === stage);
  if (list) {
    let rules = list.rules;
    
    
    let tablerows = [];
    
    rules.forEach(r => {
      let rows = convertrule(r, stage);
      tablerows.push(...rows);
    });
    let id = "#stage"+stage+" tbody";
    tablerows.forEach((r,i) => {
      let row = buildtablerow(r, stage, i+100);
      $(id).append(row);
    });
    //$("#stage"+stage+" table").addClass("sortable");
  }
}




// *** weird utilities *** 

function factorial(n) {
  for (let i = n-1; i > 1; i--) {
    n *= i;
  }
  return n;
}

//how many times does "x" appear in the pattern?
function countx(p) {
  let arr = p.split("").filter(c => c === "x");
  return arr.length;
}

//capitalize
function replacebellletters(p) {
  let arr = p.split("");
  for (let i = 0; i < arr.length; i++) {
    let c = arr[i];
    if ("etabcd".includes(c)) {
      arr.splice(i, 1, c.toUpperCase());
    }
  }
  return arr.join("");
}

function handleplural(text, plural) {
  let i = text.indexOf("[");
  let j = text.indexOf("]");
  let arr = text.split("");
  if (i > -1 && j > -1 && j > i) {
    if (plural) {
      arr.splice(j,1);
      arr.splice(i,1);
    } else {
      let count = j-i+1;
      arr.splice(i, count);
    }
  }
  return arr.join("");
}

function bellrowsort(a, b) {
  if (a.length != b.length) {
    return a.length-b.length;
  }
  let l = a.length;
  let max = l;
  let strs = {};
  strs[a] = "";
  strs[b] = "";
  let pp = "0ETABCD";
  let subs = "ABCDEFG";
  for (let i = 0; i < l; i++) {
    [a,b].forEach(r => {
      let c = r[i];
      let j = pp.indexOf(c);
      max = Math.max(max, j+10);
      let nc = j > -1 ? subs[j] : c;
      strs[r] += nc;
    });
  }
  let base = max > 9 ? max+1 : 10;
  let aa = parseInt(strs[a], base);
  let bb = parseInt(strs[b], base);
  return aa-bb;
}

function normalrowsort(a,b) {
  //first compare length
  let dl = a.length-b.length;
  if (dl != 0) {
    return dl;
  }
  //then compare number of x's
  let ax = countx(a);
  let dx = ax - countx(b);
  if (dx != 0) {
    return dx;
  }
  //if they both have x
  if (ax) {
    let di = a.split("").findIndex(c => c != "x")-b.split("").findIndex(c => c != "x");
    if (di != 0) {
      return di;
    }
    a = a.replace(/x/g, "");
    b = b.replace(/x/g, "");
  }
  //next normal forms
  let aa = normalizerow(a);
  let bb = normalizerow(b);
  let dn = bellrowsort(aa, bb);
  if (dn != 0) {
    return dn;
  }
  return bellrowsort(a,b);
}

//given a string with some bells
//transpose it to highest pitches
function normalizerow(p) {
  let a = p.split("");
  let nums = a.filter(c => c != "x").map(bellnum);
  let min = Math.min(...nums);
  let normal = [];
  let n = 0;
  let diff = 1-min;
  for (let i = 0; i < a.length; i++) {
    let c = a[i];
    let s;
    if (c === "x") {
      s = c;
    } else {
      s = places[nums[n]+diff-1];
      n++;
    }
    normal.push(s);
  }
  return normal.join("");
}

//designed for two patterns with x
//if there is no overlap in matching rows, returns false
//if there *is* overlap, the overlap is returned in the form of a row or pattern with x
function buildoverlap(p, q) {
  let chars = [];
  let match = true;
  let i = 0;
  while (match && i < p.length) {
    let cc = p[i]+q[i];
    if (cc === "xx") {
      chars.push("x");
    } else if (cc.includes("x")) {
      let c = cc[0] === "x" ? cc[1] : cc[0];
      if (chars.includes(c)) {
        match = false;
      } else {
        chars.push(c);
      }
    } else if (p[i] === q[i]) {
      chars.push(p[i]);
    } else {
      match = false;
    }
    
    i++;
  }
  return match ? chars.join("") : match;
}










// **** BELLRINGING FUNCTIONS ****

//convert bell characters to numbers
function bellnum(n) {
  return places.indexOf(n)+1;
}

//convert array of bell numbers to string of characters
function rowstring(arr) {
  let r = arr.map(n => places[n-1]);
  return r.join("");
}


function transposepattern(p, stage) {
  let arr = p.split("");
  let bells = arr.filter(c => places.includes(c)).map(bellnum);
  
  let min = Math.min(...bells);
  let max = Math.max(...bells);
  let patterns = [];
  for (let i = 1-min; i <= stage-max; i++) {
    let t = [];
    for (let j = 0; j < p.length; j++) {
      if (arr[j] === "x") {
        t.push("x");
      } else {
        let num = places.indexOf(arr[j]);
        t.push(places[num+i]);
      }
    }
    patterns.push(t.join(""));
  }
  return patterns;
}

function transpose(p, stage) {
  let arr = p.split("").map(bellnum);
  let min = Math.min(...arr);
  let max = Math.max(...arr);
  let patterns = [];
  for (let i = 1-min; i <= stage-max; i++) {
    let t = [];
    for (let j = 0; j < p.length; j++) {
      t.push(arr[j]+i);
    }
    patterns.push(rowstring(t));
  }
  return patterns;
}


function buildshortersegments(row, min, max, inc, front) {
  let segments = [];
  for (let l = min; l <= max; l+=inc) {
    let seg = front ? row.slice(0,l) : row.slice(-l);
    segments.push(seg);
  }
  return segments;
}

//row is string
function reverserow(row) {
  return row.split("").reverse().join("");
}

//row is string
function applycross(row) {
  let a = [];
  let limit = row.length%2 === 0 ? row.length : row.length-1;
  for (let i = 1; i < limit; i+=2) {
    a.push(row[i], row[i-1]);
  }
  if (row.length%2 === 1) a.push(row[row.length-1]);
  return a.join("");
}

//actually does kings + queens + princes + princesses
function buildqueens(stage) {
  let kings = [];
  for (let i = 2; i <= stage+1; i+=2) {
    if (i <= stage) kings.push(i);
    kings.unshift(i-1);
  }
  let front = kings.slice(0, Math.ceil(stage/2));
  let l = front.length;
  front.reverse();
  let queens = front.concat(kings.slice(l));
  
  let rows = {
    Kings: rowstring(kings),
    Queens: rowstring(queens)
  };
  let princes = kings;
  princes.splice(l, 1);
  princes.splice(l-1, 0, 2);
  rows.Princes = rowstring(princes);
  if (stage > 6) {
    queens.splice(l, 1);
    queens.splice(l-1, 0, 2);
    rows.Princesses = rowstring(queens);
  }
  return rows;
}



function buildtittums(stage) {
  let l = Math.ceil(stage/2);
  let top = places.slice(0,l);
  let bottom = places.slice(l, stage);
  let revtop = top.split("").reverse().join("");
  let rows = {};
  ["Tittums", "Exploded Tittums", "Exploded Tittums cross"].forEach(name => rows[name] = "");
  //"Tittums cross", 
  for (let i = 0; i < l; i++) {
    rows["Tittums"] += top[i];
    rows["Exploded Tittums"] += revtop[i];
    if (i < bottom.length) {
      for (let name in rows) {
        rows[name] += bottom[i];
      }
    }
    //rows["Tittums cross"] += top[i];
    rows["Exploded Tittums cross"] += revtop[i];
  }
  return rows;
}

//maximus versions
var stepends = {
  "Three-bell run": ["890T","80ET","765T","50ET","5890","098T"],
  "Two three-bell runs": ["7650ET","1230ET","3210ET","3450ET","5430ET","TE0345","0ET345"],
  "Step pairs": ["21ET","ET21","23ET","ET23","43ET","ET43","45ET","ET45","65ET","ET65"]
};

function buildstepends(stage) {
  let res = {};
  for (let key in stepends) {
    stepends[key].forEach(p => {
      let x = "xxxxxxxxxxxxxxxxxxxxxxxxxxx".slice(0,stage-p.length);
      let t = stage === 12 ? p : transposenumbers(p, 12, stage);
      if (t) {
        let pat = x+t;
        let a = res[key];
        if (a) {
          a.push(pat);
        } else {
          res[key] = [pat];
        }
      }
      
    });
  }
  return res;
}

//"row" is string (does not have to be complete)
//"from" and "to" are stage numbers
function transposenumbers(row, from, to) {
  let diff = to-from;
  let arr = row.split("");
  if (diff < 0) {
    let extra = places.slice(0, diff*-1);
    if (arr.find(c => extra.includes(c))) {
      return false;
    }
  }
  let t = [];
  for (let i = 0; i < row.length; i++) {
    let old = arr[i];
    let oldi = places.indexOf(old);
    let np = places[oldi+diff];
    t.push(np);
  }
  return t.join("");
}

const hagdykerows = ["34125", "341256", "1256347", "12563478", "125634789", "1256349078", "1256349078E", "1256349078ET", "1256349078ETA", "1256349078ABET", "1256349078ABETC", "1256349078ABETCD"];
//Hagdyke, Priory, Jacks
//Rollercoaster (not done yet)
function buildstepwhole(stage) {
  let rows = {};
  
  let pairs = [];
  for (let i = 0; i < stage; i+=2) {
    let j = Math.min(stage, i+2);
    pairs.push(places.slice(i, j));
  }
  let roundscross = [];
  pairs.forEach(s => {
    roundscross.push(s.split("").reverse().join(""));
  });
  rows["Rounds cross"] = roundscross.join("");
  rows["Hagdyke"] = hagdykerows[stage-5];
  
  let inside = [];
  for (let i = 1; i < stage-1; i+=2) {
    inside.push(places.slice(i,i+2));
  }
  let priory = ["1"];
  inside.forEach(p => {
    priory.push(p.split("").reverse().join(""));
  });
  if (stage%2 === 0) priory.push(places[stage-1]);
  rows["Priory"] = priory.join("");
  
  if (stage%2 === 1) pairs.pop();
  pairs.reverse();
  inside.reverse();
  let backcross = [];
  let arr = stage%2 === 0 ? pairs : inside;
  arr.forEach(p => backcross.push(p));
  if (stage%2 === 1) backcross.push("1");
  rows["Backrounds cross"] = backcross.join("");
  
  
  return rows;
}

//rows with runs of length n-1 and n-2
//skipping the ones that are near misses?
function buildlongruns(stage) {
  let tenor = places[stage-1];
  let rounds = places.slice(0, stage);
  let back = rounds.split("").reverse().join("");
  let res = {
    one: [tenor+rounds.slice(0,-1), rounds.slice(1)+"1", "1"+back.slice(0,-1), back.slice(1)+tenor],
    two: []
  };
  let penult = places[stage-2];
  let desc = [];
  let asc = [];
  for (let i = 0; i <= 2; i++) {
    let j = -2+i;
    if (j === 0) j = rounds.length;
    desc.push(rounds.slice(i, j));
    asc.push(back.slice(i, j));
  }
  res.two.push(penult+desc[0]+tenor);
  res.two.push(penult+tenor+desc[0], tenor+penult+desc[0]);
  res.two.push(tenor+desc[1]+"1");
  res.two.push("1"+tenor+desc[1]);
  res.two.push(desc[2]+"12", desc[2]+"21", "1"+desc[2]+"2");
  res.two.push("2"+asc[0]+"1", "12"+asc[0], "21"+asc[0]);
  res.two.push(asc[1]+tenor+"1", "1"+asc[1]+tenor, tenor+"1"+asc[1]);
  res.two.push(asc[2]+penult+tenor, asc[2]+tenor+penult, tenor+asc[2]+penult);
  
  return res;
}

//skipping the one that's a near miss of rounds
function buildmisplacedtreble(stage) {
  let others = places.slice(1, stage);
  let rows = [];
  for (let i = 2; i < stage-1; i++) {
    let a = others.split("");
    a.splice(i, 0, "1");
    rows.push(a.join(""));
  }
  return rows;
}

//row is string
function buildnearmisses(row) {
  let rows = [];
  for (let i = row.length-1; i > 0; i--) {
    let a = [];
    for (let j = 0; j < row.length; j++) {
      let b = row[j];
      if (j === i) {
        b = row[j-1];
      } else if (j === i-1) {
        b = row[j+1];
      }
      a.push(b);
    }
    rows.push(a.join(""));
  }
  return rows;
}



//pattern has the form of a row where some characters are specific bells and others are "X";
//returns array of STRINGS
function getrowsfrompattern(pattern) {
  let rows = [];
  //holder for bells represented by x
  let v = [];
  let rounds = places.slice(0, pattern.length);
  for (let i = 0; i < rounds.length; i++) {
    if (!pattern.includes(rounds[i])) {
      v.push(rounds[i]);
    }
  }
  if (v.length) {
    let extent = v.length === 1 ? v : buildextent(v);
    for (let i = 0; i < extent.length; i++) {
      let row = [];
      let sub = extent[i];
      let k = 0;
      for (let j = 0; j < pattern.length; j++) {
        let c = pattern[j];
        if (c === "x") {
          row.push(sub[k]);
          k++;
        } else {
          row.push(c);
        }
      }
      rows.push(row.join(""));
    }
  } else {
    rows.push(pattern);
  }
  return rows;
}

//take a pattern shorter than the given stage and produce all the versions with "X" (capital because of bell letters also being capitals)
function patternstage(pattern, stage) {
  let n = pattern.length;
  let res = [];
  for (let i = 0; i <= stage-n; i++) {
    let p = "";
    for (let j = 0; j < stage; j++) {
      if (j < i || j >= i+n) {
        p += "X";
      } else if (j === i) {
        p += pattern;
      }
    }
    res.push(p);
  }
  return res;
}

//take a pattern with parentheses and return an array of patterns with no parentheses
//no nested parentheses allowed
function handlepatterns(pattern) {
  let chars = 0;
  let openparens = [];
  let closeparens = [];
  let inside;
  let xinside;
  //collect indexes of parentheses
  for (let i = 0; i < pattern.length; i++) {
    let c = pattern[i];
    switch (c) {
      case "(":
        inside = true;
        openparens.push(i);
        break;
      case ")":
        inside = false;
        closeparens.push(i);
        break;
      default:
        if (inside && c === "x") xinside = true;
        chars++;
    }
  }
  if (openparens.length != closeparens.length || !closeparens.every((n,i) => n > openparens[i]) || chars > stage || xinside) {
    return [];
  } else {
    let current = [pattern];
    let next = [];
    for (let i = openparens.length-1; i > -1; i--) {
      for (let j = 0; j < current.length; j++) {
        let pp = expandgroup(current[j], openparens[i], closeparens[i]);
        next.push(...pp);
      }
      current = next;
      next = [];
    }
    return current;
  }
}

//take a pattern with a group in parentheses and build an extent of that group
//pattern is a string
//start and end are indices of parentheses
function expandgroup(pattern, start, end) {
  let patterns = [];
  let chunk = [];
  for (let j = start+1; j < end; j++) {
    chunk.push(bellnum(pattern[j]));
  }
  let ext = buildextent(chunk);
  ext.forEach(a => {
    let p = pattern.slice(0,start) + rowstring(a) + pattern.slice(end+1);
    patterns.push(p);
  });
  return patterns;
}

//given row r, build all the permutations
function buildextent(r) {
  let n = r.length;
  let arr = [];
  if (n === 2) {
    return extenttwo(r);
  } else if (n < 13) {
    for (let i = 0; i < n; i++) {
      let others = []; //as in "not i"
      for (let j = 0; j < n; j++) {
        if (j != i) others.push(r[j]);
      }
      let ends = buildextent(others);
      ends.forEach(a => {
        a.unshift(r[i]);
        arr.push(a);
      });
    }
  }
  return arr;
}

function extenttwo(r) {
  let arr = [r, [r[1], r[0]]];
  return arr;
}

