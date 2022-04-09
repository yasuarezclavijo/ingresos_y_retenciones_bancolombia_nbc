sap.ui.define([
    'com/bancolombia/incomeRetentions/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    "sap/ui/model/resource/ResourceModel",
    'sap/m/MessageStrip',
    'sap/ui/core/Core'
],
function (Controller, JSONModel, ResourceModel, MessageStrip, oCore) {
    "use strict";
    return Controller.extend("com.bancolombia.incomeRetentions.controller.IncomeAndRetentions", {
        onInit : function () {
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
                }
			});
            this._employeeInfo = new JSONModel();
            var societies = [];
            var that = this;
            /** Temp vars */
            let userCO = '00000042';
            let userPA = '00000004'
            /** End temp vars */
            jQuery.ajax({
                type: "GET",
                url: "/sap/zhcmgw_dataemployee_srv/ZHCMS_DATAEMPLOYEESet?sap-client=112&search=" + userCO + "&$format=json",
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

                    let endpointSocieties = "/sap/zhcmgw_dataemployee_srv/ZHCMS_BUKRSSet?sap-client=112&$filter=Land1 eq '" + country + "'&$format=json"
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
                        }
                    });
                }
            });
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
            var issuing = this.getView().byId("issuing").getSelectedItem();
            if (issuing == null){
                debugger;
            }
            var year = this.getView().byId("yearTaxable").getSelectedItem();
            if (year == null){
                debugger;
            }
            let dataEmployeeInfo = this._employeeInfo.getData();
            let infoSend = dataEmployeeInfo['infoSend'];
            infoSend['bukrs'] = this.getView().byId("issuing").getSelectedKey();
            infoSend['anio'] = this.getView().byId("yearTaxable").getSelectedKey();
            let country = dataEmployeeInfo['country'];
            var endpointB64 = '';
            if (country == 'CO') {
                endpointB64 = "/sap/zhcmgw_circol_srv/ZHCMS_DATACIRCOLSet?sap-client=112&pernr=" + infoSend['pernr'] +"&anio=" + infoSend['anio'] + "&bukrs=" + infoSend['bukrs'] + "&abkrs=" + infoSend['abkrs'] +"&$format=json";
            }
            else if (country == 'PA') {
                infoSend['abkrs'] = this.getView().byId("payrollArea").getSelectedKey();
                infoSend['subtype'] = this.getView().byId("subtype").getSelectedKey();
                endpointB64 = "/sap/zhcmgw_cirpan_srv/ZHCMS_DATACIRPANSet?sap-client=112&pernr=" + infoSend['pernr'] +"&anio=" + infoSend['anio'] + "&bukrs=" + infoSend['bukrs'] + "&abkrs=" + infoSend['abkrs'] + "&subtipo=" + infoSend['subtype'] + "&$format=json";
            }
            let base64EncodedPDF = "";
            jQuery.ajax({
                type: "GET",
                url: endpointB64,
                dataType: "json",
                async: false,
                success: function(dataFormat, textStatus, jqXHR) {
                    base64EncodedPDF = dataFormat.d.results[0].Formato
                }
            });
            var decodedPdfContent = atob(base64EncodedPDF);
            var byteArray = new Uint8Array(decodedPdfContent.length)
            for(var i=0; i<decodedPdfContent.length; i++){
                byteArray[i] = decodedPdfContent.charCodeAt(i);
            }
            var blob = new Blob([byteArray.buffer], { type: 'application/pdf' });
            var _pdfurl = URL.createObjectURL(blob);
            this._oModel.setProperty("/Source", _pdfurl);
            this._oModel.setProperty("/Title", issuing.getText() + " " + year.getText());
            this.pdfViewer.setVisible(true);
        }
    });
});
