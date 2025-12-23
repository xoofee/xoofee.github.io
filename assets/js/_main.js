/* ==========================================================================
   jQuery plugin settings and other scripts
   ========================================================================== */

$(document).ready(function(){
   // Sticky footer
  var bumpIt = function() {
      $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
    },
    didResize = false;

  bumpIt();

  $(window).resize(function() {
    didResize = true;
  });
  setInterval(function() {
    if (didResize) {
      didResize = false;
      bumpIt();
    }
  }, 250);
  // FitVids init
  $("#main").fitVids();

  // init sticky sidebar
  $(".sticky").Stickyfill();

  var stickySideBar = function(){
    var show = $(".author__urls-wrapper button").length === 0 ? $(window).width() > 1024 : !$(".author__urls-wrapper button").is(":visible");
    // console.log("has button: " + $(".author__urls-wrapper button").length === 0);
    // console.log("Window Width: " + windowWidth);
    // console.log("show: " + show);
    //old code was if($(window).width() > 1024)
    if (show) {
      // fix
      Stickyfill.rebuild();
      Stickyfill.init();
      $(".author__urls").show();
    } else {
      // unfix
      Stickyfill.stop();
      $(".author__urls").hide();
    }
  };

  stickySideBar();

  $(window).resize(function(){
    stickySideBar();
  });

  // Follow menu drop down

  $(".author__urls-wrapper button").on("click", function() {
    $(".author__urls").fadeToggle("fast", function() {});
    $(".author__urls-wrapper button").toggleClass("open");
  });

  // init smooth scroll
  $("a").smoothScroll({offset: -20});

  // add lightbox class to all image links
  $("a[href$='.jpg'],a[href$='.jpeg'],a[href$='.JPG'],a[href$='.png'],a[href$='.gif']").addClass("image-popup");

  // Magnific-Popup options
  $(".image-popup").magnificPopup({
    // disableOn: function() {
    //   if( $(window).width() < 500 ) {
    //     return false;
    //   }
    //   return true;
    // },
    type: 'image',
    tLoading: 'Loading image #%curr%...',
    gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0,1] // Will preload 0 - before current, and 1 after the current image
    },
    image: {
      tError: '<a href="%url%">Image #%curr%</a> could not be loaded.',
    },
    removalDelay: 500, // Delay in milliseconds before popup is removed
    // Class that is added to body when popup is open.
    // make it unique to apply your CSS animations just to this exact popup
    mainClass: 'mfp-zoom-in',
    callbacks: {
      beforeOpen: function() {
        // just a hack that adds mfp-anim class to markup
        this.st.image.markup = this.st.image.markup.replace('mfp-figure', 'mfp-figure mfp-with-anim');
      }
    },
    closeOnContentClick: true,
    midClick: true // allow opening popup on middle mouse click. Always set it to true if you don't provide alternative source.
  });

  // Floating Table of Contents
  var $pageContent = $('.page__content');
  // Look for TOC - Kramdown generates #markdown-toc, or it might be in a paragraph with class toc__menu
  var $toc = $pageContent.find('#markdown-toc').first();
  
  // If not found, look for ul.toc__menu
  if ($toc.length === 0) {
    $toc = $pageContent.find('ul.toc__menu').first();
  }
  
  // If TOC exists, create floating sidebar
  if ($toc.length > 0) {
    // Get the parent element that contains the TOC (usually a paragraph)
    var $tocParent = $toc.closest('p');
    if ($tocParent.length === 0) {
      $tocParent = $toc.parent();
    }
    
    // Create floating TOC sidebar
    var $floatingToc = $('<aside class="toc-sidebar">' +
      '<button class="toc-sidebar__toggle" aria-label="Toggle table of contents">' +
      '<i class="fa fa-list"></i>' +
      '</button>' +
      '<nav class="toc-sidebar__content">' +
      '<header class="toc-sidebar__header">' +
      '<h4 class="toc-sidebar__title">Table of Contents</h4>' +
      '</header>' +
      '</nav>' +
      '</aside>');
    
    // Clone the TOC content
    var $tocClone = $toc.clone();
    $tocClone.addClass('toc-sidebar__menu');
    $floatingToc.find('.toc-sidebar__content').append($tocClone);
    
    // Add to page
    $('.page__inner-wrap').append($floatingToc);
    
    // Hide original TOC (hide the paragraph or div containing it)
    $tocParent.hide();
    
    // Toggle functionality for narrow screens
    var $toggle = $floatingToc.find('.toc-sidebar__toggle');
    var $content = $floatingToc.find('.toc-sidebar__content');
    
    $toggle.on('click', function() {
      $content.toggleClass('is-open');
      $toggle.toggleClass('is-open');
      $floatingToc.toggleClass('is-visible');
    });
    
    // Handle window resize
    var handleResize = function() {
      var isWide = $(window).width() >= 1200; // $large breakpoint
      
      if (isWide) {
        // Wide screen: always show, remove toggle functionality
        $content.addClass('is-open');
        $toggle.hide();
        $floatingToc.addClass('is-visible');
      } else {
        // Narrow screen: start collapsed, show toggle
        $content.removeClass('is-open');
        $toggle.show();
        if (!$content.hasClass('is-open')) {
          $floatingToc.removeClass('is-visible');
        }
      }
    };
    
    // Initial setup
    handleResize();
    
    // Handle resize events
    $(window).on('resize', function() {
      handleResize();
    });
    
    // Smooth scroll for TOC links
    $floatingToc.find('a').on('click', function(e) {
      var href = this.getAttribute('href');
      if (href && href.indexOf('#') === 0) {
        var target = $(href);
        if (target.length) {
          e.preventDefault();
          $('html, body').animate({
            scrollTop: target.offset().top - 20
          }, 500);
          
          // Close TOC on narrow screens after clicking
          if ($(window).width() < 1200) {
            $content.removeClass('is-open');
            $toggle.removeClass('is-open');
            $floatingToc.removeClass('is-visible');
          }
        }
      }
    });
  }

});
