angular.module('ngFabForm')
    .factory('ngFabFormDirective', function (ngFabForm, $compile, $templateRequest, $rootScope, $timeout)
    {
        'use strict';


        function insertValidationMsgs(params)
        {
            var scope = params.scope,
                el = params.el,
                cfg = params.cfg,
                formCtrl = params.formCtrl,
                ngModelCtrl = params.ngModelCtrl,
                attrs = params.attrs;

            // remove error tpl if any
            if (params.currentValidationVars.tpl && (Object.keys(params.currentValidationVars.tpl).length !== 0)) {
                params.currentValidationVars.tpl.remove();
            }

            // load validation directive template
            $templateRequest(cfg.validationsTemplate)
                .then(function processTemplate(html)
                {
                    // add custom (attr) validations
                    html = ngFabForm.addCustomValidations(html, ngModelCtrl.$validators, attrs);

                    // create new scope for validation messages
                    var privateScope = $rootScope.$new(true);
                    privateScope.attrs = attrs;
                    privateScope.form = formCtrl;
                    privateScope.field = ngModelCtrl;

                    // compile and insert messages
                    var compiledAlert = $compile(html)(privateScope);
                    params.currentValidationVars.tpl = compiledAlert[0];
                    ngFabForm.insertErrorTpl(compiledAlert[0], el, attrs);
                });
        }


        function setAsteriskForLabel(el, attrs, cfg)
        {
            // check if jquery is loaded
            if (window.$) {
                var label = $('label[for=' + attrs.name + ']');
                if (label.length < 1) {
                    label = el.prev('label');
                }

                if (label && label[0]) {
                    if (attrs.type !== 'radio' && attrs.type !== 'checkbox') {
                        label[0].innerText = label[0].innerText + cfg.asteriskStr;
                    }
                }
            } else {
                throw 'auto-setting an asterisk requires jQuery';
            }
        }


        // return factory
        return {
            restrict: 'E',
            require: ['?^form', '?ngModel'],
            compile: function (el, attrs)
            {
                // don't execute for buttons
                if (attrs.type) {
                    if (attrs.type.toLowerCase() === 'submit' || attrs.type.toLowerCase() === 'button') {
                        return;
                    }
                }

                // only execute if ng-model is present and
                // no name attr is set already
                // NOTE: needs to be set in $compile-function for the validation too work
                if (ngFabForm.config.setNamesByNgModel && attrs.ngModel && !attrs.name) {
                    // set name attribute if none is set
                    el.attr('name', attrs.ngModel);
                    attrs.name = attrs.ngModel;
                }


                return function (scope, el, attrs, controllers)
                {

                    var formCtrl = controllers[0],
                        cfg,
                        ngModelCtrl = controllers[1],
                    // is object to pass by reference
                        currentValidationVars = {
                            tpl: undefined
                        };


                    function ngFabFormCycle(oldCfg)
                    {
                        // apply validation messages
                        // only if required controllers and validators are set
                        if (ngModelCtrl && cfg.validationsTemplate && (Object.keys(ngModelCtrl.$validators).length !== 0) && (!oldCfg || cfg.validationsTemplate !== oldCfg.validationsTemplate)) {
                            insertValidationMsgs({
                                scope: scope,
                                el: el,
                                cfg: cfg,
                                formCtrl: formCtrl,
                                ngModelCtrl: ngModelCtrl,
                                attrs: attrs,
                                currentValidationVars: currentValidationVars
                            });
                        }
                        // otherwise remove if a tpl was set before
                        else if (!cfg.validationsTemplate && currentValidationVars.tpl && (Object.keys(currentValidationVars.tpl).length !== 0)) {
                            currentValidationVars.tpl.remove();
                        }

                        // set asterisk for labels
                        if (cfg.setAsteriskForRequiredLabel && attrs.required === true && (!oldCfg || cfg.setAsteriskForRequiredLabel !== oldCfg.setAsteriskForRequiredLabel || cfg.asteriskStr !== oldCfg.asteriskStr)) {
                            setAsteriskForLabel(el, attrs, cfg);
                        }
                    }

                    // INIT
                    // after formCtrl should be ready
                    $timeout(function ()
                    {
                        // only execute if formCtrl is set
                        if (formCtrl) {
                            // get configuration from parent form
                            if (!cfg) {
                                cfg = formCtrl.ngFabFormConfig;
                            }
                            ngFabFormCycle();


                            // watch for config changes
                            scope.$on('NG_FAB_FORM_OPTIONS_CHANGED_FOR_' + formCtrl.$name, function (ev, newCfg, oldCfg)
                            {
                                cfg = newCfg;
                                ngFabFormCycle(oldCfg);
                            });
                        }
                    }, 0);
                };
            }
        };
    });
