(function() {
  if (!window.top.callPhantom && !window.top.chromeScreenshot) {
    console.log("Render tests require Puppeteer or PhantomJS");
    return;
  }

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  beforeAll(function(done) {
    setTimeout(done, 200);
  });

  function screenshot(div, options) {
    var rect = div.getBoundingClientRect();
    var offset = {
      width: div.offsetWidth,
      height: div.offsetHeight,
      top: rect.top,
      left: rect.left
    };
    for (var win = window; win !== window.top; win = win.parent) {
      var rectframe = win.frameElement.getBoundingClientRect();
      offset.top += rectframe.top;
      offset.left += rectframe.left;
    }

    var image;
    if (window.top.callPhantom) {
      var base64 = window.top.callPhantom("render", {
        offset: offset,
        fileName: options && options.fileName || undefined
      });
      image = document.createElement("img");
      image.src = "data:image/png;base64," + base64;
      return image;
    } else if (window.top.chromeScreenshot) {
      image = document.createElement("img");
      window.top.chromeScreenshot({
        offset: offset,
        fileName: options && options.fileName || undefined
      }).then(function(data) {
        image.src = "data:image/png;base64," + data;
      });
      return image;
    }
    throw new Error("Screenshots are not supported on this platform");
  }

  function image2canvas(img) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0);
    return { canvas: canvas, ctx: ctx };
  }

  function image2data(img) {
    return image2canvas(img).canvas.toDataURL("image/png", 1);
  }

  function image2pixels(img) {
    return image2canvas(img).ctx.getImageData(0, 0, img.width, img.height).data;
  }

  function imagesEqual(a, b) {
    if (a.width !== b.width || a.height !== b.height) {
      return false;
    }
    return image2data(a) === image2data(b);
  }

  function imagesFuzzyEqual(a, b, delta) {
    if (!delta) return imagesEqual(a, b);

    var A = image2pixels(a);
    var B = image2pixels(b);
    if (A.length !== B.length) return false;
    for (var i = 0; i < A.length; i++) {
      var diff = A[i] - B[i];
      if (diff < 0) diff = -diff;
      if (diff > delta) return false;
    }
    return true;
  }

  function delayedFrames(callback, frames) {
    if (frames === 0) {
      return callback;
    }
    return function() {
      window.requestAnimationFrame(delayedFrames(callback, frames - 1));
    };
  }

  var regex = new RegExp("^/base/tests/Render/[^/]+/[^/]+\\.qml$");
  var tests = Object.keys(window.__karma__.files)
    .filter(function(path) {
      return regex.test(path);
    })
    .map(function(path) {
      return {
        qml: path,
        png: path.replace(/.qml$/, ".png"),
        group: path.replace("/base/tests/Render/", "").replace(/\/[^/]+$/, "")
                   .replace(/\//g, "."),
        name: path.replace(/^.*\//, "").replace(".qml", "")
      };
    })
    .reduce(function(data, entry) {
      if (!data.hasOwnProperty(entry.group)) {
        data[entry.group] = [];
      }

      data[entry.group].push(entry);
      return data;
    }, {});

  Object.keys(tests).forEach(function(group) {
    describe("Render." + group, function() {
      setupDivElement();
      tests[group].forEach(function(test) {
        it(test.name, function(done) {
          var div = loadQmlFile(test.qml, this.div).dom;
          var result;
          var expected;
          var loaded = 0;
          var fuzz = group.indexOf("Fuzzy") !== -1 ? 1 : 0;

          var process = function() {
            if (++loaded !== 2) return;
            expect(imagesFuzzyEqual(result, expected, fuzz)).toBe(true);
            done();
          };

          expected = document.createElement("img");
          expected.src = test.png;
          expected.onload = process;

          var onTestLoad = function() {
            result = screenshot(div, {
              fileName: test.group + "/" + test.name + ".png"
            });
            result.onload = process;
          };

          if (group.indexOf("Async") !== -1) {
            window.onTestLoad = function(options) {
              delayedFrames(onTestLoad, options && options.framesDelay || 0)();
            };
          } else {
            onTestLoad();
          }
        });
      });
    });
  });
}());
