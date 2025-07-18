/*
BOLD-RO.JS.LIQUID

Updated installation file to help automate most of the installation tasks & common customizations for Recurring Orders


SUMMARY:
Uses the BOLD.common event model to assist in loading Recurring Orders.  Creates a number of event hooks that additional
customizations can take advanatge of.

REQUIRES:
  * bold-product (updated Nov. 29 or later)
  * bold-variant (Any version for general functionality, updated Feb. 8 or later for subscription only checks)
  * bold-ro-init
  * bold-common

NEW EVENTS TRIGGERED:
  * BOLD_RECURRING_ORDERS_cart_widget_loaded        Triggered when the widget loads in a cart
  * BOLD_RECURRING_ORDERS_widget_loaded				Triggered when the widget loads on a product
  * BOLD_RECURRING_ORDERS_add_to_existing_loaded	Triggered when the 'Add to Existing Order' link loads
  * BOLD_RECURRING_ORDERS_prepaid_change			Triggered when the 'Prepaid' option is changed

NEW EVENT LISTENERS:
  * BOLD_COMMON_variant_changed						BOLD.recurring_orders.updateRecurringWidget
  * BOLD_COMMON_cart_loaded							BOLD.recurring_orders.updateRecurringCartWidget
  													BOLD.recurring_orders.checkRecurringCart
  * BOLD_RECURRING_ORDERS_widget_loaded				BOLD.recurring_orders.onRecurringWidgetLoaded
  * BOLD_RECURRING_ORDERS_cart_widget_loaded		BOLD.recurring_orders.setupAdditionalCheckoutButtons
  * BOLD_RECURRING_ORDERS_prepaid_change			BOLD.recurring_orders.printPrepaidPrice
  													BOLD.recurring_orders.updatePrepaidSubscriptionButton
  * BOLD_OPTIONS_total_changed						BOLD.recurring_orders.updateRecurringWidgetPrice

NEW JQUERY DOCUMENT-LEVEL EVENT LISTENERS
  * When changing a variant selector, get the variant information and emit a BOLD_COMMON_variant_changed event
  * When submitting a product form, check to see if the variant is subscription only & respond appropriately
  * When submitting a cart form or clicking a checkout link, check if the cart is recurring & respond appropriately

*/


//Ensure all objects are initialized
var BOLD = BOLD || {};

BOLD.products = BOLD.products || {};
BOLD.variant_lookup = BOLD.variant_lookup || {};
BOLD.recurring_orders = BOLD.recurring_orders || {};
BOLD.recurring_orders.AddToExistingListener = false;

BOLD.shop = BOLD.shop || {};
BOLD.helpers = BOLD.helpers || {};
BOLD.language = BOLD.language || {};

BOLD.recurring_orders.base_checkout_url = 'https://recurringcheckout.com';
BOLD.recurring_orders.base_script_url = 'https://ro.boldapps.net';

BOLD.recurring_orders.csrf_token = BOLD.recurring_orders.csrf_token || '775e4634405371661f03beaac36d1c1b';


BOLD.helpers.moneyFormatter = BOLD.helpers.moneyFormatter || {
	formatMoneyFromTemplate: function formatMoneyFromTemplate(format, price, quote) {
		_this = this;
		if (quote === undefined) {
			quote = "'";
		}

		if (quote == "'") {
			format = format.replace('"', "'");
		} else {
			format = format.replace("'", '"');
		}
		var money = format;

		if (price === "") {
			//format to be $12.00
			if (format.indexOf("{{amount}}") != -1) {
				money = money.replace("{{amount}}", "");
			}
			//format with decimal so $12,00
			if (format.indexOf("{{amount_with_comma_separator}}") != -1) {
				money = money.replace("{{amount_with_comma_separator}}", "");
			}
			//format no decimal with space separator so 1 342
			if (format.indexOf("{{amount_no_decimals_with_space_separator}}") != -1) {
				money = money.replace("{{amount_no_decimals_with_space_separator}}", "");
			}
			//format no decimal with space separator so 1,342
			if (format.indexOf("{{amount_no_decimals_with_comma_separator}}") != -1) {
				money = money.replace("{{amount_no_decimals_with_comma_separator}}", "");
			}
			//format with decimal so $12
			if (format.indexOf("{{amount_no_decimals}}") != -1) {
				money = money.replace("{{amount_no_decimals}}", "");
			}
		} else {
			//format to be $12.00
			if (format.indexOf("{{amount}}") != -1) {
				money = money.replace("{{amount}}", _this.formatMoney(price, 2, '.', ','));
			}
			//format with decimal so $12,00
			if (format.indexOf("{{amount_with_comma_separator}}") != -1) {
				money = money.replace("{{amount_with_comma_separator}}", _this.formatMoney(price, 2, ',', ','));
			}
			//format no decimal with space separator so 1 342
			if (format.indexOf("{{amount_no_decimals_with_space_separator}}") != -1) {
				money = money.replace("{{amount_no_decimals_with_space_separator}}", _this.formatMoney(price, 0, '', ' '));
			}
			//format no decimal with space separator so 1,342
			if (format.indexOf("{{amount_no_decimals_with_comma_separator}}") != -1) {
				money = money.replace("{{amount_no_decimals_with_comma_separator}}", _this.formatMoney(price, 0, '', ' '));
			}
			//format with decimal so $12
			if (format.indexOf("{{amount_no_decimals}}") != -1) {
				money = money.replace("{{amount_no_decimals}}", _this.formatMoney(price, 0, '', ','));
			}
		}

		return money;
	},
	formatMoney: function formatMoney(n, c, d, t) {
		var n = n,
			c = isNaN(c = Math.abs(c)) ? 2 : c,
			d = d == undefined ? "." : d,
			t = t == undefined ? "," : t,
			s = n < 0 ? "-" : "",
			i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
			j = (j = i.length) > 3 ? j % 3 : 0;
		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	}
};




//Set up events & listeners
BOLD.recurring_orders.setupEventListeners = function(){
  if(BOLD.common && BOLD.common.eventEmitter){
    BOLD.common.eventEmitter.off('BOLD_COMMON_cart_loaded', BOLD.helpers.updateRawCart);
    BOLD.common.eventEmitter.on('BOLD_COMMON_cart_loaded', BOLD.helpers.updateRawCart);

    BOLD.common.eventEmitter.off('BOLD_COMMON_checkout', BOLD.recurring_orders.onCheckout);
    BOLD.common.eventEmitter.on('BOLD_COMMON_checkout', BOLD.recurring_orders.onCheckout);

    BOLD.common.eventEmitter.off('BOLD_COMMON_add_to_cart', BOLD.recurring_orders.preventSubscriptionOnlyWithoutSubscription);
    BOLD.common.eventEmitter.on('BOLD_COMMON_add_to_cart', BOLD.recurring_orders.preventSubscriptionOnlyWithoutSubscription);

    BOLD.common.eventEmitter.off('BOLD_COMMON_variant_changed', BOLD.recurring_orders.updateRecurringWidget);
    BOLD.common.eventEmitter.on('BOLD_COMMON_variant_changed', BOLD.recurring_orders.updateRecurringWidget);

    BOLD.common.eventEmitter.off('BOLD_COMMON_cart_loaded', BOLD.recurring_orders.checkRecurringCart);
    BOLD.common.eventEmitter.on('BOLD_COMMON_cart_loaded', BOLD.recurring_orders.checkRecurringCart);

    if(BOLD.recurring_orders.modes.current_mode == BOLD.recurring_orders.modes.recurring_cart){
      BOLD.common.eventEmitter.off('BOLD_COMMON_cart_loaded', BOLD.recurring_orders.updateRecurringCartWidget);
      BOLD.common.eventEmitter.on('BOLD_COMMON_cart_loaded', BOLD.recurring_orders.updateRecurringCartWidget);
     BOLD.common.eventEmitter.off('BOLD_RECURRING_ORDERS_cart_widget_loaded',BOLD.recurring_orders.setupAdditionalCheckoutButtons);
     BOLD.common.eventEmitter.on('BOLD_RECURRING_ORDERS_cart_widget_loaded',BOLD.recurring_orders.setupAdditionalCheckoutButtons);
    }

    BOLD.common.eventEmitter.off('BOLD_RECURRING_ORDERS_widget_loaded', BOLD.recurring_orders.onRecurringWidgetLoaded);
    BOLD.common.eventEmitter.on('BOLD_RECURRING_ORDERS_widget_loaded', BOLD.recurring_orders.onRecurringWidgetLoaded);

    BOLD.common.eventEmitter.off('BOLD_RECURRING_ORDERS_prepaid_change', BOLD.recurring_orders.printPrepaidPrice);
    BOLD.common.eventEmitter.on('BOLD_RECURRING_ORDERS_prepaid_change', BOLD.recurring_orders.printPrepaidPrice);
    BOLD.common.eventEmitter.off('BOLD_RECURRING_ORDERS_prepaid_change', BOLD.recurring_orders.updatePrepaidSubscriptionButton);
    BOLD.common.eventEmitter.on('BOLD_RECURRING_ORDERS_prepaid_change', BOLD.recurring_orders.updatePrepaidSubscriptionButton);

    BOLD.common.eventEmitter.on('BOLD_OPTIONS_total_changed', function(a){
      var form = a.data.option_product.form;
      var variant = BOLD.helpers.getVariantByForm(form);
      if(variant && form){
        BOLD.recurring_orders.updateRecurringWidgetPrice(variant, form);
      }
    });


    if(window.jQuery && typeof jQuery().on === 'function' && !BOLD.recurring_orders.jQuerySetup){

      //Remove any existing document-level events before attempting to set them up - we don't want to accidentally run things twice if the initialization runs more than once
      jQuery(document).off('click', '.swatch,[class*="single-option"]', BOLD.helpers.triggerVariantChange);
      jQuery(document).off('change', '[name^="id"],[class*="single-option"]', BOLD.helpers.triggerVariantChange);
      jQuery(document).off('submit', 'form[action*="/cart/add"]', BOLD.helpers.triggerAddToCartEvent);
      jQuery(document).off('click', 'form[action*="/cart/add"] [type="submit"]:not(.bold_clone)', BOLD.helpers.triggerAddToCartEvent);
      jQuery(document).off('submit', 'form[action*="/checkout"]:not([action*="/tools/checkout"], [action*="/checkout/recurring_product"])', BOLD.helpers.triggerCheckoutEvent);
      jQuery(document).off('click', '[name="checkout"]:not(.bold_clone):not([action*="/tools/checkout"]),[href*="/checkout"]:not(.bold_clone):not([action*="/tools/checkout"])', BOLD.helpers.triggerCheckoutEvent);
      jQuery(document).off('change', '[name=quantity]', BOLD.helpers.triggerProductQuantityChange);
      jQuery(document).off('change', '[name^="updates"]', BOLD.helpers.triggerCartQuantityChange );

      jQuery(document).on('click', '.swatch,[class*="single-option"]', BOLD.helpers.triggerVariantChange);
      jQuery(document).on('change', '[name^="id"],[class*="single-option"]', BOLD.helpers.triggerVariantChange);
      jQuery(document).on('submit', 'form[action*="/cart/add"]', BOLD.helpers.triggerAddToCartEvent);
      jQuery(document).on('click', 'form[action*="/cart/add"] [type="submit"]:not(.bold_clone)', BOLD.helpers.triggerAddToCartEvent);
      jQuery(document).on('submit', 'form[action*="/checkout"]:not([action*="/tools/checkout"], [action*="/checkout/recurring_product"])', BOLD.helpers.triggerCheckoutEvent);
      jQuery(document).on('click', '[name="checkout"]:not(.bold_clone):not([action*="/tools/checkout"]),[href*="/checkout"]:not(.bold_clone):not([action*="/tools/checkout"]):not([href*="/tools/checkout"])', BOLD.helpers.triggerCheckoutEvent);
      jQuery(document).on('change', '[name=quantity]', BOLD.helpers.triggerProductQuantityChange);
      jQuery(document).on('change', '[name^="updates"]', BOLD.helpers.triggerCartQuantityChange );


      //Options V1: Update recurring widget when a priced option changes
      jQuery(document).on('change', '.shappify_option input, .shappify_option select', function(){
        if(this.form && this.form.variant){
          BOLD.recurring_orders.updateRecurringWidgetPrice(this.form.variant, this.form);
        }
      });
      BOLD.recurring_orders.jQuerySetup = true;

    }
  }
}


BOLD.helpers.triggerCommonEvent = function(bold_event_name, original_event, additional_data){
  if(window.BOLD && BOLD.common && BOLD.common.eventEmitter){
    BOLD.common.eventEmitter.emit((bold_event_name.indexOf('BOLD_') > -1 ? bold_event_name : 'BOLD_COMMON_' + bold_event_name), {target:(original_event ? original_event.target : null), original_event:original_event, data: additional_data});
  }
};

BOLD.helpers.triggerCheckoutEvent = function(evt){
  var original_target = evt.target;
  var form = (original_target.tagName == 'FORM' ? original_target : (original_target.form ? original_target.form : null));
  if(form){
    var checkoutInput = BOLD.helpers.newHiddenInput('checkout','checkout');
    form.appendChild(checkoutInput);
  }
  var cart = (BOLD.common && BOLD.common.cartDoctor ? BOLD.common.cartDoctor.rawCart : BOLD.rawCart);
  BOLD.helpers.triggerCommonEvent('checkout', evt, {form:form, cart:cart});
};

BOLD.helpers.triggerAddToCartEvent = function(evt){
  var original_target = evt.target;
  var form = (original_target.tagName == 'FORM' ? original_target : (original_target.form ? original_target.form : null));
  var variant = (form && form.variant ? form.variant : (form ? BOLD.helpers.getVariantByForm(form) : null));
  BOLD.helpers.triggerCommonEvent('add_to_cart', evt, {form:form, variant:variant});
};

BOLD.helpers.triggerCartQuantityChange = function(evt){
    var original_target = evt.target;
    var form = (original_target.form ? original_target.form : (typeof jQuery == 'function' && jQuery().closest ? jQuery(original_target).closest('form')[0] : null));
    var cart = (BOLD.common && BOLD.common.cartDoctor ? BOLD.common.cartDoctor.rawCart : BOLD.rawCart);

    var item, line, variant;
    //If there's a form, try to find out which item/line was updated
    if(form){
      var all_inputs = form.querySelectorAll('[name^="updates"]');
      if(all_inputs.length === cart.items.length){
        var item_count = cart.items.length;
        for(var i = 0; i < item_count; i++){
          if(all_inputs[i] == original_target){
            item = cart.items[i];
            line = i + 1;
            break;
          }
        }
      }
    }

    //If we have an item, try to get the variant details as well
    if(item){
      variant = BOLD.helpers.getVariantByItem(item);
    }

    BOLD.helpers.triggerCommonEvent('cart_quantity_changed', evt, {cart:cart, form:form, item:item, line:line, variant:variant, input:original_target, quantity:parseInt(original_target.value)});
};

BOLD.helpers.triggerProductQuantityChange = function(evt){
  var original_target = event.target;
  var form = (original_target.form ? original_target.form : (typeof jQuery == 'function' && jQuery().closest ? jQuery(original_target).closest('form')[0] : null));
  var variant = (form && form.variant ? form.variant : BOLD.helpers.getVariantByForm(form));
  var product = (BOLD.variant_lookup && variant ? BOLD.products[BOLD.variant_lookup[variant.id]] : null);

  BOLD.helpers.triggerCommonEvent('product_quantity_changed', evt, {product:product, variant:variant, form:form, input:original_target, quantity:parseInt(original_target.value)})

};

BOLD.helpers.triggerVariantChange = function(evt){
  var original_target = evt.target;
  var form = (original_target.form ? original_target.form : (typeof jQuery == 'function' && jQuery().closest ? jQuery(original_target).closest('form')[0] : null));
  if(form){
    setTimeout(function(){
      //Brief timeout to make sure whatever is happening on the page to change the variant has completed - we don't want to be one change behind
      var variant = BOLD.helpers.getVariantByForm(form);
      if(variant){
        BOLD.common.eventEmitter.emit('BOLD_COMMON_variant_changed', {variant:variant});
      }
    }, 50);
  }
};


//Try to prevent form submission if a subscription-only product is being added to the cart without a subscription
BOLD.recurring_orders.preventSubscriptionOnlyWithoutSubscription = function(evt){
  var original_target = evt.target;
  var form = (original_target.form ? original_target.form : (typeof jQuery == 'function' && jQuery().closest ? jQuery(original_target).closest('form')[0] : null));
  var variant = BOLD.helpers.getVariantByForm(form);
  if(evt && evt.oritinal_event && variant && variant.ro_lookup && variant.ro_lookup.subscription_only && (!form['recurring_radio_btn'] || !form['recurring_radio_btn'].value)){
    evt.original_event.preventDefault();
    evt.original_event.stopImmediatePropagation();
    return false;
  }
};

BOLD.recurring_orders.onCheckout = function(evt){
  if(evt && evt.data && evt.data.form){
    BOLD.recurring_orders.redirectToRecurringCheckout(evt.data.form);
  }else{
    var form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('enctype', 'multipart/form-data');
    form.style.display = 'none';
    if(BOLD.recurring_orders.redirectToRecurringCheckout(form)){
      if(evt && evt.original_event){
        evt.original_event.preventDefault();
        evt.original_event.stopImmediatePropagation();
      }
      document.body.appendChild(form);
      form.submit();
    }
  }
}

BOLD.recurring_orders.redirectToRecurringCheckout = function(form){
  var current_mode = BOLD.recurring_orders.modes.current_mode;
  if((current_mode == BOLD.recurring_orders.modes.mixed_cart && window.mixed_cart) || (current_mode == BOLD.recurring_orders.modes.recurring_cart && form.recurring_radio_btn && form.recurring_radio_btn.value == 1)){
    var url = 'https://recurringcheckout.com/s/' + BOLD.common.Shopify.shop.permanent_domain.replace('.myshopify.com','') + '/checkout/recurring' + (current_mode == BOLD.recurring_orders.modes.mixed_cart ? '/' + BOLD.common.Shopify.cart.token : '_full_cart') + '?shop_url=' + BOLD.common.Shopify.shop.permanent_domain + (typeof google_analytics_get_param_string === 'function' ? google_analytics_get_param_string() : '');
    form.setAttribute('action', url);

    if(!form['shopify_cart']){
      var cart_field = document.createElement('input');
      cart_field.setAttribute('type','hidden');
      cart_field.setAttribute('name','shopify_cart');

     //If Product Options is in play, make sure to use the expanded cart so that we capture all of the priced options
      var recurring_cart = (BOLD.common && BOLD.common.cartDoctor ? BOLD.common.cartDoctor.fix(BOLD.common.cartDoctor.rawCart, true) : BOLD.rawCart);
      for(var i=0; i < recurring_cart.items.length; i++){
        recurring_cart.items[i].properties = recurring_cart.items[i].properties_all || recurring_cart.items[i].properties;
      }
      cart_field.setAttribute('value',encodeURIComponent(JSON.stringify(recurring_cart)));
      form.appendChild(cart_field);
    }

    if(!form['csrf_bold_token']){
      var csrf_field = document.createElement('input');
      csrf_field.setAttribute('type','hidden');
      csrf_field.setAttribute('name','csrf_bold_token');
      csrf_field.setAttribute('value', BOLD.recurring_orders.csrf_token);
      form.appendChild(csrf_field);
    }

    BOLD.recurring_orders.appendCustomerFields(form);
    return true;
  }
};

BOLD.recurring_orders.updateRecurringWidget = function(data){
  //Make sure we have a variant
  var variant = data.variant;
  if(!variant){
    return;
  }

  //Make sure we can find the product
  var product = BOLD.products[BOLD.variant_lookup[variant.id]];
  if(!product){
    console.warn('Recurring orders: Could not find product for variant ID ' + variant.id);
    return;
  }

  //Make sure we have a form to work with
  var form = BOLD.helpers.getFormByVariant(variant);
  if(!form){
    return;
  }
  form.variant = variant;

  if(!(BOLD.recurring_orders.modes.current_mode && (BOLD.recurring_orders.modes.current_mode == BOLD.recurring_orders.modes.single_product || BOLD.recurring_orders.modes.current_mode == BOLD.recurring_orders.modes.mixed_cart))){
      if(BOLD.customer.id && !BOLD.recurring_orders.AddToExistingListener){
        var a2e_url = BOLD.recurring_orders.base_script_url + '/recurring_settings/add_to_order?&shop_url=' + BOLD.common.Shopify.shop.permanent_domain + '&group_id=0&customer_id=' + (BOLD.customer.id || '') + '&product_id='+ product.id + '&variant_id=' + variant.id + '&v=2';
        BOLD.helpers.loadScript(a2e_url, function(){ BOLD.common.eventEmitter.emit('BOLD_RECURRING_ORDERS_add_to_existing_loaded', {form:form, product:product, variant:variant}) });
        BOLD.recurring_orders.AddToExistingListener = true;
      }
      return;
  }

  //Make sure the 'addtocart' class is on the submit button
  var submit_button = form.querySelector('[type="submit"]') || {};
  if(submit_button && submit_button.className.indexOf('addtocart') == -1){
    submit_button.className += ' addtocart';
  }
  //Create a default container for the case where there is no submit button in the form
  var parent_container = submit_button.parentElement || form;

  //Find the RO div. If we can't find one, create one
  var roDiv = form.getElementsByClassName('product_rp_div')[0] || null;
  var convertibleWidget = form.getElementsByClassName('ro_widget')[0] || null;
  var custom_button=form.querySelector('[class*=custom_button]');
  var ro_loading_text = BOLD.language.recurring_orders_loading || "Loading subscription info..." || '<span class="ro_loading">Loading subscription info...</\span>';

  if(!roDiv){
    roDiv = BOLD.recurring_orders.newRecurringWidget(product.id);
    if(submit_button.previousElementSibling){
      submit_button.previousElementSibling.appendChild(roDiv);
    }else{
      parent_container.appendChild(roDiv);
    }
  }
  if(!custom_button){
    var custom_button = BOLD.recurring_orders.newCustomButton(product.id);
    if(submit_button.previousElementSibling && submit_button.previousElementSibling.tagName != 'INPUT' && submit_button.previousElementSibling.tagName != 'BUTTON' && (!submit_button.previousElementSibling.className || submit_button.previousElementSibling.className.indexOf('product_rp_div') === -1)){
      submit_button.previousElementSibling.appendChild(custom_button);
    }else{
      parent_container.appendChild(custom_button);
    }
  }

  //Clear the widget if the variant isn't recurring
  if(!variant.ro_lookup){
    roDiv.innerHTML = '';
    BOLD.recurring_orders.removeHiddenInputFields(form);
    if(window.jQuery){
      jQuery('[class*="' + product.id + '_custom_button"]').hide();
      jQuery('.addtocart').show();
    }
    return;
  }

 //Update the single-product mode variable
  window['$' + product.id + '_rp_variant_id'] = variant.id;


  //If the widget is already drawn for the correct group ID, just update the display price
  if(variant.ro_lookup.group_id && form.current_group_id == variant.ro_lookup.group_id && (roDiv.innerHTML && roDiv.innerHTML != ro_loading_text || convertibleWidget && convertibleWidget.innerHTML)){
    BOLD.recurring_orders.updateRecurringWidgetPrice(variant,form);
    BOLD.recurring_orders.updateRecurringWidgetDiscount(variant, form);
    return;
  }

  //Group ID has changed - time to load the widget
  form.current_group_id = variant.ro_lookup.group_id;

  //Is this a chached widget?
  var is_cached = (BOLD.recurring_orders.cached_group && BOLD.recurring_orders.cached_group[variant.ro_lookup.group_id]);
  if(is_cached){
    //The new cached widgets do not draw into the old RO div
    roDiv.innerHTML = '';
  }else{
    roDiv.innerHTML = ro_loading_text;
  }

  //Make sure the RO div has the correct class
  if(roDiv.getAttribute('class').indexOf(product.id) === -1){
    roDiv.setAttribute('class', roDiv.getAttribute('class').split(' p')[0] + ' p' + product.id);
  }
  //Make sure the RO button has the correct class
  var roButton = form.getElementsByClassName('_custom_button')[0] || null;
  if(roButton){
    if(roButton.getAttribute('class').indexOf(product.id) === -1){
      roButton.setAttribute('class', roButton.getAttribute('class').split('_custom_button')[0] + ' ' + product.id + '_custom_button');
    }
  }

  //Remove old hidden input fields
  BOLD.recurring_orders.removeHiddenInputFields(form);

  //Disable & hide add-to-cart buttons while the widget loads
  var add_to_cart_buttons = form.querySelectorAll('[type="submit"]');
  for(var btn = 0; btn < add_to_cart_buttons.length; btn++){
    add_to_cart_buttons[btn].setAttribute('disabled','disabled');
    add_to_cart_buttons[btn].style.visibility = 'hidden';
  }

  //Prune old event listeners
  if(typeof jQuery === 'function'){
    jQuery('#customButton, .' + product.id + '_custom_button').off("click");
    jQuery(document).off('change', "[name='id'],.single-option-selector");
  }

  //Load scripts required to print the widgets
  if(is_cached){
    BOLD.common.eventEmitter.emit('BOLD_RECURRING_ORDERS_widget_loaded', {form:form, product:product, variant:variant});
  }else{
    var url = BOLD.recurring_orders.base_script_url + '/recurring_settings/generate_rp?shop_url=' + BOLD.common.Shopify.shop.permanent_domain + '&group_id='+ variant.ro_lookup.group_id +'&customer_id=' + (BOLD.customer.id || '') + '&product_id='+product.id + '&variant_id=' + variant.id + '&v=2';
    BOLD.helpers.loadScript(url, function(){ BOLD.common.eventEmitter.emit('BOLD_RECURRING_ORDERS_widget_loaded', {form:form, product:product, variant:variant}) });
  }
  if(BOLD.customer.id){
    var a2e_url = BOLD.recurring_orders.base_script_url + '/recurring_settings/add_to_order?&shop_url=' + BOLD.common.Shopify.shop.permanent_domain + '&group_id='+ variant.ro_lookup.group_id +'&customer_id=' + (BOLD.customer.id || '') + '&product_id='+ product.id + '&variant_id=' + variant.id + '&v=2';
    BOLD.helpers.loadScript(a2e_url, function(){ BOLD.common.eventEmitter.emit('BOLD_RECURRING_ORDERS_add_to_existing_loaded', {form:form, product:product, variant:variant}) });
  }
};
BOLD.recurring_orders.onRecurringWidgetLoaded = function(data){

  var variant = data.variant,
      form = data.form,
      product = data.product;

  if(!variant || !variant.ro_lookup){
    return;
  }

  //Check to make sure the RO div doesn't still have the 'loading' text
  var roDiv = form.getElementsByClassName('product_rp_div')[0] || null;
  var ro_loading_text = BOLD.language.recurring_orders_loading || "Loading subscription info..." || '<span class="ro_loading">Loading subscription info...</\span>';
  if(roDiv && roDiv.innerHTML == ro_loading_text){
    roDiv.innerHTML = '';
  }


  if(BOLD.recurring_orders.modes.current_mode == BOLD.recurring_orders.modes.single_product){
    BOLD.recurring_orders.appendCustomerFields(form);
  }

  //Save the discount percentage (in case there are multiple groups loading on the page)
  if(BOLD.recurring_orders.config){
    BOLD.recurring_orders.group_id_lookup = BOLD.recurring_orders.group_id_lookup || {};
    BOLD.recurring_orders.group_id_lookup[variant.ro_lookup.group_id] = {multiplier: BOLD.recurring_orders.config.discount_percentage};
  }

  //Re-enable the add-to-cart button
  if(form){
    var add_to_cart_buttons = form.querySelectorAll('[type="submit"]');
    for(var btn = 0; btn < add_to_cart_buttons.length; btn++){
      add_to_cart_buttons[btn].removeAttribute('disabled');
      add_to_cart_buttons[btn].style.visibility = null;
    }
  }

  //RECURRING ORDERS - PRINT PREPAID DISCOUNTED PRICE WHEN PREPAID OPTION IS SELECTED/CHANGED
  var ro_prepaid_toggle = form.getElementsByClassName('prepaid_checkbox');
  if(ro_prepaid_toggle.length){
    ro_prepaid_toggle[0].removeEventListener('change', BOLD.recurring_orders.prepaidChange);
    ro_prepaid_toggle[0].addEventListener('change', BOLD.recurring_orders.prepaidChange);
  }
  var ro_prepaid_selector = form.getElementsByClassName('prepaid_length_select');
  if(ro_prepaid_selector.length){
    ro_prepaid_selector[0].removeEventListener('change', BOLD.recurring_orders.prepaidChange);
    ro_prepaid_selector[0].addEventListener('change', BOLD.recurring_orders.prepaidChange);
    ro_prepaid_selector[0].setAttribute('name', 'bold_ro_prepaid_duration');
  }

  if(window.jQuery){
    jQuery('[name="recurring_radio_btn"]',form).first().trigger('click');
    jQuery('.prepaid_checkbox',form).trigger('change');
    jQuery('.prepaid_length_select',form).trigger('change');
  }

  BOLD.recurring_orders.updateRecurringWidgetPrice(form.variant, form);
  BOLD.recurring_orders.toggleCustomButton(form);
}

BOLD.recurring_orders.prepaidChange = function(e){
  var form = this.form;
  var variant = form.variant || BOLD.helpers.getVariantByForm(form);
  BOLD.common.eventEmitter.emit('BOLD_RECURRING_ORDERS_prepaid_change', {value:this.value, form:form, variant: variant});
};
BOLD.recurring_orders.printPrepaidPrice = function(data){
  if(!data.variant)
    return;

  var variant = data.variant;
  var form = data.form || BOLD.helpers.getFormByVariant(variant);
  if(!form){
    return;
  }

  var selected_prepaid_duration = form.bold_ro_prepaid_duration || form.getElementsByClassName('prepaid_length_select')[0];
  if(!selected_prepaid_duration){
    return;
  }

  var price = variant.price;
  var selected_prepaid_option = selected_prepaid_duration[selected_prepaid_duration.selectedIndex];
  var prepaid_discount = (100 - parseInt(selected_prepaid_option.getAttribute('data-discount-percentage'))) * 0.01;
  var prepaid_duration = parseInt(selected_prepaid_option.text);

  var prepaid_div = form.getElementsByClassName('prepaid_length_div')[0];

  var price_node = document.createElement('span');
  price_node.className = 'prepaid_total';
  price_node.innerHTML = 'Total: ' + BOLD.common.Shopify.formatMoney(price * prepaid_duration * prepaid_discount, BOLD.common.Shopify.shop.money_format);

  if(prepaid_div.getElementsByClassName('prepaid_total').length){
    prepaid_div.removeChild(prepaid_div.getElementsByClassName('prepaid_total')[0]);
  }
  prepaid_div.appendChild(price_node);
};
BOLD.recurring_orders.updatePrepaidSubscriptionButton = function(data){
  BOLD.recurring_orders.toggleCustomButton(data.form)
}
BOLD.recurring_orders.toggleCustomButton = function(form){
  if(!form){
    return;
  }
  var submit_button = form.querySelector('[type=submit]');
  var custom_button = form.querySelector('[class*="custom_button"]');
  var prepaid_chkbox = form.querySelector('.prepaid_checkbox');

  var custom_button_visible;
  var submit_button_visible;

  //If convertable widget and subscription selected, show neither
  if(form['bold-ro__selector_radio_button'] && form['bold-ro__selector_radio_button'].value != 0){
    custom_button_visible = false;
  }
  if((BOLD.recurring_orders.modes.current_mode == BOLD.recurring_orders.modes.single_product && form['bold-ro__selector_radio_button'] && form['bold-ro__selector_radio_button'].value != 0) ||
  (form['bold-ro__selector_radio_button'] && form['bold-ro__selector_radio_button'].value == 3)){
    submit_button_visible = false;
  }
  //If single product mode and subscription selected OR if prepaid selected, hide submit/show custom button
  else if((BOLD.recurring_orders.modes.current_mode == BOLD.recurring_orders.modes.single_product && form.recurring_radio_btn && form.recurring_radio_btn.value !=0) || (prepaid_chkbox && prepaid_chkbox.checked)){
    submit_button_visible = false;
    custom_button_visible = true;
  }
  //Hide custom button/show submit
  else{
    submit_button_visible = true;
    custom_button_visible = false;
  }
  submit_button.style.display = (submit_button_visible ? null : 'none');
  custom_button.style.display = (custom_button_visible ? null : 'none');
  BOLD.helpers.triggerCommonEvent('BOLD_RECURRING_ORDERS_product_button_display', null, {submit_button_visible: submit_button_visible, subscription_button_visible: custom_button_visible, form: form});
}

BOLD.recurring_orders.newRecurringWidget = function(product_id){
  var roDiv =  document.createElement('div');
  roDiv.className='product_rp_div p' + product_id;
  return roDiv;
}
BOLD.recurring_orders.newCustomButton = function(product_id){
  var custom_button = document.createElement('a');
  custom_button.className = product_id + '_custom_button';

  
  custom_button.setAttribute('data-toggle', 'modal');
  custom_button.setAttribute('data-target','#myModal');
  custom_button.style.display = 'none';
  custom_button.innerHTML = "BUY NOW";

  var add_to_cart_button = document.querySelector('form[action*="/cart/add"] [type="submit"]');
  if(add_to_cart_button){
    
    custom_button.addEventListener('click', function(e){ e.stopPropagation(); })
  }
  return custom_button;
};
BOLD.recurring_orders.newRecurringCartDiv = function(){
  var cartDiv = document.createElement('div');
  cartDiv.className = 'product_rp_cart_div';
  return cartDiv;
};

BOLD.recurring_orders.appendCustomerFields = function(form){
  if(!form || !form.appendChild) return;

  form.appendChild(BOLD.helpers.newHiddenInput('shopify_customer_id', BOLD.customer.id, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('email', BOLD.customer.email, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('address1',BOLD.customer.address1, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('address',BOLD.customer.address, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('city',BOLD.customer.city, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('company',BOLD.customer.company, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('country',BOLD.customer.country, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('first_name',BOLD.customer.first_name, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('last_name',BOLD.customer.last_name, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('phone',BOLD.customer.phone, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('province',BOLD.customer.province, 'ro_customer_field'));
  form.appendChild(BOLD.helpers.newHiddenInput('zip',BOLD.customer.zip, 'ro_customer_field'));
};
BOLD.recurring_orders.updateRecurringWidgetPrice = function(variant, form){
  if(!variant && form && form.variant){
    variant = form.variant;
  }
  if(variant && variant.ro_lookup){
    var ro_price = BOLD.helpers.calcTotalPrice(variant, form, {always_discount:true,update_variant_price:false});
    var ro_discount_price_field = form.getElementsByClassName('new_discounted_price');
    if(ro_discount_price_field.length){
      ro_discount_price_field[0].innerHTML = BOLD.common.Shopify.formatMoney(ro_price, BOLD.common.Shopify.shop.money_format);
    }

    var ro_amount_off_field = form.getElementsByClassName('new_amount_discounted');
    if(ro_amount_off_field.length){
      ro_amount_off_field[0].innerHTML = BOLD.common.Shopify.formatMoney(variant.price - ro_price, BOLD.common.Shopify.shop.money_format);
    }
  }
};
BOLD.recurring_orders.removeHiddenInputFields = function(form){
  var fields = form.querySelectorAll('.frequency_type_text, .group_id, .discounted_price, .ro_discount_percentage, .ro_unformatted_price, .ro_customer_field');
  for(var f=0; f<fields.length; f++){
    fields[f].parentElement.removeChild(fields[f]);
  }
};
BOLD.recurring_orders.updateRecurringWidgetDiscount = function(variant, form){
  if(form && form.getElementsByClassName){
    var discount_fields = form.getElementsByClassName('ro_discount_percentage');
    for(var df=0; df < discount_fields.length; df++){
      discount_fields[df].value = (1.00 - BOLD.helpers.calcROMultiplier(variant, form, true) ) * 100;
    }
  }
};
BOLD.recurring_orders.updateRecurringCartWidget = function(cart){
  var cartForms = document.querySelectorAll('form[action*="/cart"]:not([action*="/cart/add"]), form[action*="/checkout"]');
  for(var cf = 0; cf < cartForms.length; cf++){
    var form = cartForms[cf];
    var recurring_cart_div = form.querySelector('.product_rp_cart_div');

    if(!recurring_cart_div){
      recurring_cart_div = BOLD.recurring_orders.newRecurringCartDiv();

      var submit_button = form.querySelector('[type="submit"]') || {};
      var parent_element = submit_button.parentElement || form;
      parent_element.appendChild(recurring_cart_div);
    }
  }

  var url = BOLD.recurring_orders.base_script_url + '/recurring_settings/generate_rp_cart?&shop_url=' + BOLD.common.Shopify.shop.permanent_domain + '&customer_id=' + BOLD.customer.id + '&subtotal=' + cart.total_price;
  BOLD.helpers.loadScript(url, function(){BOLD.common.eventEmitter.emit('BOLD_RECURRING_ORDERS_cart_widget_loaded')});
};
BOLD.recurring_orders.setupAdditionalCheckoutButtons = function(){
  var cartForms = document.querySelectorAll('form[action*="/cart"]:not([action*="/cart/add"]), form[action*="/checkout"]');
  for(var cf = 0; cf < cartForms.length; cf++){
    var form = cartForms[cf];
    var rcDiv = form.querySelector('.product_rp_cart_div');
    if(rcDiv){
      rcDiv.removeEventListener('click', BOLD.recurring_orders.hideAdditionalCheckoutButtons);
      rcDiv.addEventListener('click', BOLD.recurring_orders.hideAdditionalCheckoutButtons);
    }
  }
}
BOLD.recurring_orders.hideAdditionalCheckoutButtons = function(){
  var cartForms = document.querySelectorAll('form[action*="/cart"]:not([action*="/cart/add"]), form[action*="/checkout"]');
  for(var cf = 0; cf < cartForms.length; cf++){
    var form = cartForms[cf];
    var additional_checkout_buttons = document.querySelectorAll('[class*="additional-checkout"], [class*="additional_checkout"]');
    if(!additional_checkout_buttons.length){
      return;
    }
    var hide = (form['recurring_radio_btn'].value == 1 || (BOLD.recurring_orders.modes.current_mode == BOLD.recurring_orders.modes.mixed_cart && window.mixed_cart));
    for(var acb=0; acb < additional_checkout_buttons.length; acb++){
      additional_checkout_buttons[acb].style.display = (hide ? 'none' : null);
    }
  }
};
BOLD.recurring_orders.checkRecurringCart = function(cart){
  if(typeof cart != 'object') return;
  for(var i = 0; i < cart.items.length; i++){
    var item = cart.items[i];
    if((item.properties && item.properties.frequency_type) || (item.Bold && item.Bold.frequency_type)){
      window.mixed_cart = true;
      return;
    }
  }
  window.mixed_cart = false;
};

BOLD.helpers.loadScript = function(url, callback){
  var script = document.createElement("script")
  script.type = "text/javascript";
  if (script.readyState){  //IE
    script.onreadystatechange = function(){
      if (script.readyState == "loaded" || script.readyState == "complete"){
        script.onreadystatechange = null;
        if(typeof callback === 'function')
          callback();
      }
    };
  } else {  //Others
    script.onload = function(){
      if(typeof callback === 'function')
        callback();
    };
  }
  script.src = url;
  document.getElementsByTagName("head")[0].appendChild(script);
};
BOLD.helpers.calcUnitPrice = function(variant, form){
  if(typeof variant !== 'object' || !variant) return null;
  if(typeof variant.bold_original_price === 'undefined') variant.bold_original_price = variant.price;
  if(!variant.btm_lookup || typeof(mathEval)!='function') return variant.bold_original_price;
  parsedFormula = variant.btm_lookup.formula;
  for(var key in variant.btm_lookup){
    var field = variant.btm_lookup[key];
    var field_value = (form['properties[' + field + ']'] ? form['properties[' + field + ']'].value : 0);
    parsedFormula = parsedFormula.split('{' + field + '}').join(field_value);
  }
  return (Math.ceil(mathEval(parsedFormula)) || 1) * variant.bold_original_price;
};
BOLD.helpers.calcOptionsTotal = function(form){
  //Total with Options V2
  if(BOLD.options && BOLD.options.app && BOLD.options.app.getOptionProductByForm && BOLD.options.app.getOptionProductByForm(form)){
    return (BOLD.options.app.getOptionProductByForm(form).priceHandler ? BOLD.options.app.getOptionProductByForm(form).priceHandler.total : 0);
  }
  //Total with Options V1
  var extrasList = form.querySelectorAll('.shappify_option_value [data-variant]:checked');
  var totalExtras = 0;
  for(var index = 0; index < extrasList.length; index++){
    if(extrasList[index].getAttribute && !isNaN(parseFloat(extrasList[index].getAttribute('data-price'))))
      totalExtras += Math.round(parseFloat(extrasList[index].getAttribute('data-price')) * 100.0, 0);
  }
  return parseInt(totalExtras);
};

BOLD.helpers.calcROMultiplier = function(variant, form, always_discount){
  var multiplier = 1.00;
  if(form['recurring_radio_btn'] && (form['recurring_radio_btn'].value == 2 || always_discount) && BOLD.recurring_orders.group_id_lookup && form.variant && form.variant.ro_lookup && form.variant.ro_lookup.group_id && typeof BOLD.recurring_orders.group_id_lookup[form.variant.ro_lookup.group_id] != 'undefined'){
    multiplier = BOLD.recurring_orders.group_id_lookup[form.variant.ro_lookup.group_id].multiplier;
  }
  else if(form['recurring_radio_btn'] && (form['recurring_radio_btn'].value == 2 || always_discount) && form.getElementsByClassName('ro_discount_percentage').length && form.getElementsByClassName('ro_discount_percentage')[0].value){
    var discount_amount =  parseFloat(form.getElementsByClassName('ro_discount_percentage')[0].value);
    if(!isNaN(discount_amount))
      multiplier -= discount_amount * 0.01;
  }
  return (multiplier >= 0 ? multiplier : 1.00);
};
BOLD.helpers.calcTotalPrice = function(variant, form, options){
  if(typeof options !== 'object') options = {};
  if(!form && this.form) form = this.form;
  if(!form){
    form = BOLD.helpers.getFormByVariant(variant);
  }
  if(!form) return;

  if(!variant && form.variant) variant = form.variant;
  if(!variant) return;

  if(typeof BOLD.shop.dynamic_pricing === 'undefined'){
    BOLD.shop.dynamic_pricing = true;
  }
  if(typeof options.update_variant_price === 'undefined'){
    options.update_variant_price = true;
  }
  var total_price = (BOLD.helpers.calcUnitPrice(variant,form) + BOLD.helpers.calcOptionsTotal(form)) * BOLD.helpers.calcROMultiplier(variant, form, options.always_discount);
  if(options.update_variant_price && BOLD.shop.dynamic_pricing){
    variant.price = total_price;
  }
  return total_price;
};
BOLD.helpers.getVariantByForm = function(form){
  //Check to make sure we can find the product/variant
  if(!(form.id && form.id.value && BOLD.variant_lookup && BOLD.products)){
    return null;
  }
  var variantId = form.id.value;
  var product_handle = BOLD.variant_lookup[variantId];
  var product = BOLD.products[product_handle];

  if(!product) {
    return null;
  }

  var variant;
  for(var vindex in product.variants){
    if(product.variants[vindex].id == variantId){
      variant = product.variants[vindex];
      form.variant = variant;
      break;
    }
  }
  return variant;
};
BOLD.helpers.getFormByVariant = function(variant){
  //Make sure we have a form to work with
  var variantIdFields = document.querySelectorAll('[name="id"]');
  var variantIdField = {};
  for(var vif = 0; vif < variantIdFields.length; vif++){
    if(variantIdFields[vif].value==variant.id){
      variantIdField = variantIdFields[vif];
    }
  }
  return variantIdField.form;
}
BOLD.helpers.initializeForm = function(form){
  var variant = BOLD.helpers.getVariantByForm(form);
  if(variant){
    BOLD.common.eventEmitter.emit('BOLD_COMMON_variant_changed', {variant:variant});
  }
};
BOLD.helpers.initializeAllForms = function(){
  var allForms = document.querySelectorAll('form[action*="/cart/add"]');
  for(var f=0; f < allForms.length; f++){
    BOLD.helpers.initializeForm(allForms[f]);
  }
};
BOLD.helpers.newHiddenInput = function(name, value, classname){
  var input = document.createElement('input');
  input.setAttribute('type', 'hidden');
  input.setAttribute('name', name);
  input.setAttribute('value', value);
  input.className = 'bold_hidden_input ' + name + ' ' + classname;
  return input;
};
BOLD.helpers.updateRawCart = function(cart){
  if(cart && cart.items){
    BOLD.rawCart = cart;
  }
};
BOLD.recurring_orders.setupEventListeners();
if(window.addEventListener){
  window.addEventListener('load', BOLD.recurring_orders.setupEventListeners);

  document.addEventListener('DOMContentLoaded', BOLD.helpers.hideAdditionalCheckoutButtons);
  document.addEventListener('DOMContentLoaded', BOLD.recurring_orders.setupEventListeners);
  document.addEventListener('DOMContentLoaded', BOLD.helpers.initializeAllForms);
  document.addEventListener('DOMContentLoaded', function(){ BOLD.common.eventEmitter.emit('BOLD_COMMON_cart_loaded', BOLD.rawCart || BOLD.common.Shopify.cart)});
}else{
  window.attachEvent('onload', BOLD.recurring_orders.setupEventListeners)
  window.addEventListener('onload', BOLD.helpers.initializeAllForms)
}