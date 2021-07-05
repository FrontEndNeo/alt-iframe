# alt-iframe
A simple javascript utility library to include partial html (iframe alternate) without a framework or jQuery.

    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Single HTML Page</title>
    </head>
    <body>
      ...
      ...
      <!-- use [src] attribute to load a partial html inside the tag -->
      <div src="partial-html-files/header.html"></div>
      ...
      ...
      <!-- use [replace] attribute along with [src] attribute to replace the tag with partial html content -->
      <br src="partial-html-files/footer.html" replace >
      ...
      ...
      ...
      <!-- use [href] and [target] attribute with values starting with # to load [href] content on [target] element -->
      <a href="#partial-html-files/profile.html" target="#targetContainer">Profile</a>
      ...
      <button href="#partial-html-files/profile.html" target="#targetContainer">Profile</button>
      ...
      ...
      ...
      <script src="https://cdn.jsdelivr.net/gh/frontendneo/alt-iframe/dist/es5/alt-iframe.min.js"></script>

    </body>
    </html>
    
  ---
  
  <a href="https://frontendneo.github.io/alt-iframe/example" target="_blank">Preview Example-1</a>
  
  <a href="https://frontendneo.github.io/alt-iframe/example2" target="_blank">Preview Example-2</a>
  
  <a href="https://frontendneo.github.io/alt-iframe/example3" target="_blank">Preview Example-3</a>
  
