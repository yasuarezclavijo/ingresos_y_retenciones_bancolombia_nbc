sap.ui.define([
    'com/bancolombia/incomeRetentions/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/base/Log'
],
function (Controller, JSONModel, Log) {
    "use strict";
    return Controller.extend("com.bancolombia.incomeRetentions.controller.IncomeAndRetentions", {
        onInit : function () {
            /**
             * Definición de variables scope para view XML manejo de dinamismo DOM, valores de inicio.
             */
            this._oModel = new JSONModel({
				Source: '',
				Title: "",
				Height: "37rem",
                showFieldsExtra: false,
                payrollArea: [
					{
						"id": "Q8",
						"label": "Q8"
					},
                    {
						"id": "Q9",
						"label": "Q9"
					}
                ],
                subtype: [
					{
						"id": "9RNP",
						"label": "9RNP"
					},
                    {
						"id": "9RSP",
						"label": "9RSP"
					}
                ],
                grid: {
                    "labelSpanXL": 12,
                    "labelSpanL": 12,
                    "labelSpanM": 12,
                    "labelSpanS": 12,
                    "columnsXL": 2,
                    "columnsL": 2,
                    "columnsM": 2
                },
                buttonVisibility: true,
                busyIndicatorVisibility: false
			});
            this._oLogger = Log.getLogger("sap.ui.demo.IncomeAndRetentions");
            /**
             * Employee Info JSONModel para compartir entre metodos información capturada en momentos de llamada a las multiples API's.
             */
            this._employeeInfo = new JSONModel();
            /**
             * Get variables manifest.json.
             */
            this.sapClient = this.getOwnerComponent().getManifestEntry("/sap.app/sap_client");
            var societies = [];
            var that = this;
            /** Temp vars */
            let userCO = '00000042';
            let userPA = '00000004'
            /** End temp vars */
            /**
             * Llamado http GET mediante proxy a la información del empleado.
             * Si el mismo es exitoso validara el país de respuesta para definir hoja i18n de modismos en el español
             * Adicionalmente formara o alterara la grid para visualización diferenciada por país.
             * Llamado HTTP GET a los burks de sociedades para exponerlos en lista desplegable.
             */
            jQuery.ajax({
                type: "GET",
                url: `/sap/zhcmgw_dataemployee_srv/ZHCMS_DATAEMPLOYEESet?sap-client=${that.sapClient}&search=${userPA}&\$format=json`,
                dataType: "json",
                async: false,
                success: function(dataEmployee, textStatus, jqXHR) {
                    let infoSend = {
                        'abkrs': dataEmployee.d.results[0].Abkrs,
                        'pernr': dataEmployee.d.results[0].Pernr
                    }
                    that._employeeInfo.setProperty("/infoSend", infoSend);
                    let country = dataEmployee.d.results[0].Molga;
                    that._employeeInfo.setProperty("/country", country);

                    let endpointSocieties = `/sap/zhcmgw_dataemployee_srv/ZHCMS_BUKRSSet?sap-client=${that.sapClient}&$filter=Land1 eq '${country}'&$format=json`
                    if (country == 'CO') {
                        sap.ui.getCore().getConfiguration().setLanguage("es-co");
                    }
                    else if (country == 'PA') {
                        sap.ui.getCore().getConfiguration().setLanguage("es-pa");
                        that._oModel.setProperty("/showFieldsExtra", true);
                        that._oModel.setProperty("/grid", {
                            "labelSpanXL": 12,
                            "labelSpanL": 12,
                            "labelSpanM": 12,
                            "labelSpanS": 12,
                            "columnsXL":4,
                            "columnsL": 4,
                            "columnsM": 4
                        });
                    }
                    jQuery.ajax({
                        type: "GET",
                        url: endpointSocieties,
                        dataType: "json",
                        async: false,
                        success: function(dataBukrs, textStatus, jqXHR) {
                            dataBukrs.d.results.forEach(function(val, idx){
                                societies.push({
                                    "id": val.Bukrs,
                                    "label": val.Bukrs + " " + val.Butxt
                                });
                            });
                        },
                        error: function(XMLHttpRequest, textStatus, errorThrown) {
                            let failMessage = that.getView().getModel("i18n").getResourceBundle().getText("errorFailServices");
                            that._oLogger.error(`Fail call service: ${errorThrown}`);
                            that._oModel.setProperty("/messageTextStrip", failMessage);
                            that._oModel.setProperty("/messageTypeStrip", 'Error');
                            that.showMsgStrip(true);
                        }
                    });
                },
                error: function(XMLHttpRequest) {
                    let failMessage = that.getView().getModel("i18n").getResourceBundle().getText("errorFailServices");
                    that._oLogger.error(`Fail call service: ${XMLHttpRequest}`);
                    that._oModel.setProperty("/messageTextStrip", failMessage);
                    that._oModel.setProperty("/messageTypeStrip", 'Error');
                    that.hiddenAllFromError();
                    that.showMsgStrip(true);
                }
            });
            /**
             * Llamado a variable en manifest.json de cuantos años se deben mostrar y alimentar la lista de años disponibles para mostar el certificado.
             */
            jQuery.sap.addUrlWhitelist("blob");
            this.pdfViewer = this.getView().byId("viewerIncomeRetentions");
            this.pdfViewer.setVisible(false);
            this._oModel.setProperty("/Societies", societies);
            var valueYearToShow = this.getOwnerComponent().getManifestEntry("/sap.app/years_to_show");
            const currentYear = new Date().getFullYear();
            var years = [];
            for (var y = currentYear; y >= currentYear - valueYearToShow; y--) {
                years.push({
                    "id": y,
                    "label": y
                });
            }
            this._oModel.setProperty("/Years", years);
            this.getView().setModel(this._oModel);
        },
        onCorrectPathClick: function() {
            var msg_error = false;
            this.pdfViewer.setVisible(false);
            var issuing = this.getView().byId("issuing").getSelectedItem();
            if (issuing == null){
                msg_error = true;
            }
            var year = this.getView().byId("yearTaxable").getSelectedItem();
            if (year == null){
                msg_error = true;
            }
            let dataEmployeeInfo = this._employeeInfo.getData();
            let infoSend = dataEmployeeInfo['infoSend'];
            infoSend['bukrs'] = this.getView().byId("issuing").getSelectedKey();
            infoSend['anio'] = this.getView().byId("yearTaxable").getSelectedKey();
            let country = dataEmployeeInfo['country'];
            var endpointB64 = '';
            if (country == 'CO') {
                endpointB64 = `/sap/zhcmgw_circol_srv/ZHCMS_DATACIRCOLSet?sap-client=${this.sapClient}&pernr=${infoSend['pernr']}&anio=${infoSend['anio']}&bukrs=${infoSend['bukrs']}&abkrs=${infoSend['abkrs']}&$format=json`;
            }
            else if (country == 'PA') {
                infoSend['abkrs'] = this.getView().byId("payrollArea").getSelectedKey();
                infoSend['subtype'] = this.getView().byId("subtype").getSelectedKey();
                endpointB64 = `/sap/zhcmgw_cirpan_srv/ZHCMS_DATACIRPANSet?sap-client=${this.sapClient}&pernr=${infoSend['pernr']}&anio=${infoSend['anio']}&bukrs=${infoSend['bukrs']}&abkrs=${infoSend['abkrs']}&subtipo=${infoSend['subtype']}&$format=json`;
                var payrollArea = this.getView().byId("payrollArea").getSelectedItem();
                if (payrollArea == null){
                    msg_error = true;
                }
                var subtype = this.getView().byId("subtype").getSelectedItem();
                if (subtype == null){
                    msg_error = true;
                }
            }
            if (!msg_error) {
                this._oModel.setProperty("/buttonVisibility", false);
                this._oModel.setProperty("/busyIndicatorVisibility", true);
                let base64EncodedPDF = null;
                var that = this;
                this.showMsgStrip(false);
                jQuery.ajax({
                    type: "GET",
                    url: endpointB64,
                    dataType: "json",
                    async: true,
                    success: function(dataFormat, textStatus, jqXHR) {
                        if (dataFormat?.d?.results[0]?.Formato != '') {
                            base64EncodedPDF = dataFormat?.d?.results[0]?.Formato;
                        }
                        if (base64EncodedPDF != null) {
                            var decodedPdfContent = atob(base64EncodedPDF);
                            var byteArray = new Uint8Array(decodedPdfContent.length)
                            for(var i=0; i<decodedPdfContent.length; i++){
                                byteArray[i] = decodedPdfContent.charCodeAt(i);
                            }
                            var blob = new Blob([byteArray.buffer], { type: 'application/pdf' });
                            var _pdfurl = URL.createObjectURL(blob);
                            that._oModel.setProperty("/Title", issuing.getText() + " " + year.getText());
                        } else {
                            var _pdfurl = null;
                            let msgNotFound = that.getView().getModel("i18n").getResourceBundle().getText("msgNotFound");
                            that._oModel.setProperty("/Title", msgNotFound);
                            that._oModel.setProperty("/messageTextStrip", msgNotFound);
                            that._oModel.setProperty("/messageTypeStrip", 'Warning');
                            that.showMsgStrip(true);
                        }
                        that._oModel.setProperty("/buttonVisibility", true);
                        that._oModel.setProperty("/busyIndicatorVisibility", false);
                        that._oModel.setProperty("/Source", _pdfurl);
                        that.pdfViewer.setVisible(true);
                    }
                });
            } else {
                this._oModel.setProperty("/buttonVisibility", true);
                this._oModel.setProperty("/busyIndicatorVisibility", false);
                let messageFormIncomplete = this.getView().getModel("i18n").getResourceBundle().getText("errorFormNoComplete");
                this._oModel.setProperty("/messageTextStrip", messageFormIncomplete);
                this._oModel.setProperty("/messageTypeStrip", 'Error');
                this.showMsgStrip(true);
            }
        },
        showMsgStrip: function (showStatus) {
            this.getView().byId("boxmessage").setVisible(showStatus);
		},
        hiddenAllFromError: function () {
            this.getView().byId("FormToolbar").setVisible(false);
            this.getView().byId("buttonContainer").setVisible(false);
        }
    });
});
