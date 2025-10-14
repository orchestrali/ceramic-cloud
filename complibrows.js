


$(function() {
  $(".header").on("click", toggledisplay);
});


function toggledisplay(e) {
  let elem = $(e.currentTarget);
  elem.children(".arrow").toggleClass("rotate");
  let text = elem.text().toLowerCase();
  $("#"+text).toggle();
}
