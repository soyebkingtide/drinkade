$(document).ready(function(){
  jQuery(".collection_button").click(function(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    
    $(this).addClass("active_button");
    $(this).parents(".collection_intro").siblings().find(".collection_button").removeClass("active_button");
    var collection_id = $(this).attr("id");
    var win_width = jQuery(document).width();
    if(win_width <= 589){
        var page_offset = 150; 
    }
    else {
    	var page_offset = 200; 
    }
    $(".collection_wrap").each(function(){
      if($(this).hasClass(collection_id)){
        $(this).addClass("show_collection");
        
        $([document.documentElement, document.body]).animate({
            scrollTop: $(this).offset().top - page_offset
        }, 2000);        
      }
      else {
        $(this).removeClass("show_collection");
      }
    });
  });
  jQuery(".faq_que").click(function(){
		$(this).next(".faq_ans").slideToggle();
    	$(this).toggleClass("faq_open");
	}); 
  
  jQuery(".product_checkout").click(function(){
  	$(".cart__checkout").trigger("click");  
  });
  jQuery(".payment-buttons .addtocart").click(function(){
    $(".checkout_buttons_wrap").show();
    
  });
  jQuery(document).on('click', '.js-drawer-open button.site-nav__link.site-nav__link--icon.js-drawer-open-nav, .continue_shopping', function(){  
    setTimeout(function(){
    	jQuery(".drawer__close-button").trigger("click");
    }, 200);
  });
  
 
  
});