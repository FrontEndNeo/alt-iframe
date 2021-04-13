function getProfile(pid) {

  $.ajax('https://reqres.in/api/users/' + pid)
    .done(function (apiData) {
      // console.log('🚀 ~ apiData', apiData);

      var profData = apiData.data;
      // console.log('🚀 ~ profData', profData);

      showProfile(profData);
    });

}

// bind without template
function showProfile(profData) {

  var fullName = profData.first_name + ' ' + profData.last_name;

  $('#profImg').attr({
    src: profData.avatar,
    alt: fullName
  });

  $('#profFullName').html(fullName);
  $('#profEmail').html(profData.email);

}

// Highlight nav menu item
function setMenu(menuLink) {
  $(menuLink).addClass('active').siblings().removeClass('active');
}

// Template Preview links click event listener
$(document).on('click', '.btn-preview', function (e) {
  var btnPreview    = e.target;
  var $section      = $(btnPreview).closest('section');
  // var tmplType      = $section.data('type');
  // var tmplContent   = $section.find('textarea')[0].value;
  var tmplData      = JSON.parse($section.find('textarea')[1].value.trim() || '{}');
  var previewTarget = $section.find('.preview')[0];

  // nxT(tmplType+':'+tmplContent, tmplData, previewTarget);         //template-content with type: prefix; Handlebars: ...
  // nxT('#tmpl-'+tmplType, tmplData, previewTarget);                //template-element-ID; #templateXyz
  // nxT('#tmpl-'+tmplType+':'+tmplType, tmplData, previewTarget);   //template-elementID with :type suffix; #templateXyz:Handlebars
  nxT($section.find('textarea')[0], tmplData, previewTarget);      //template-element

});
