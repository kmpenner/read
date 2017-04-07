/**
* This file is part of the Research Environment for Ancient Documents (READ). For information on the authors
* and copyright holders of READ, please refer to the file AUTHORS in this distribution or
* at <https://github.com/readsoftware>.
*
* READ is free software: you can redistribute it and/or modify it under the terms of the
* GNU General Public License as published by the Free Software Foundation, either version 3 of the License,
* or (at your option) any later version.
*
* READ is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
* without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
* See the GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License along with READ.
* If not, see <http://www.gnu.org/licenses/>.
*/
/**
* editors imageViewer object
*
* @author      Stephen White  <stephenawhite57@gmail.com>
* @copyright   @see AUTHORS in repository root <https://github.com/readsoftware/read>
* @link        https://github.com/readsoftware
* @version     1.0
* @license     @see COPYING in repository root or <http://www.gnu.org/licenses/>
* @package     READ Research Environment for Ancient Documents
* @subpackage  Utility Classes
*/
var EDITORS = EDITORS || {};

/**
* Constructor for Image Viewer Object
*
* @type Object
*
* @param imgVECfg is a JSON object with the following possible properties
*  "imageCanvas" an HTML5 canvas element for displaying the image.
*  "imageEditDiv" an HTML DIV element where the editor UI (canvas object + tools) is or can be attached.
*  "initViewPercent" a number between 10 and 100 indication the initial percentage of the image to display.
*  "initViewOffset" a point indicating the image coordinate to place at the upperleft of the viewer
*  "navOpacity" a number from 10 to 100 indicating the opacity of the navigation panel
*  "navSizePercent" a number from 5 to 30 roughly indicating the size of the nav panel as a percentage of the viewer's size
*  "navPositionTop" a number pixels from the top to position the top of the nav panel
*  "navPositionLeft" a number pixels from the left to position the left of the nav panel
*
* @returns {ImageVE}

*/

EDITORS.ImageVE =  function(imgVECfg) {
  var imgVE = this, imgFilename,imgSrc,
      imgContainerDiv = $('<div id="imgContainerDiv" />');
  //read configuration and set defaults
  this.config = imgVECfg;
  this.type = "ImageVE";
  this.dataMgr = imgVECfg['dataMgr'] ? imgVECfg['dataMgr']:null;
  this.layoutMgr = imgVECfg['layoutMgr'] ? imgVECfg['layoutMgr']:null;
  this.eventMgr = imgVECfg['eventMgr'] ? imgVECfg['eventMgr']:null;
  this.id = imgVECfg['id'] ? imgVECfg['id']: null;
  this.image = imgVECfg['image'] ? imgVECfg['image']:null;
  this.imgCanvas = imgVECfg['imageCanvas'] ? imgVECfg['imageCanvas']:null;
  this.vwPercent = imgVECfg['initViewPercent'] ? imgVECfg['initViewPercent']:100;
  this.vwOffset = imgVECfg['initViewOffset'] && !isNaN(imgVECfg['initViewOffset'].x) && !isNaN(imgVECfg['initViewOffset'].y) ? imgVECfg['initViewOffset']:{x:0,y:0};
  this.navOpacity = imgVECfg['navOpacity'] ? imgVECfg['navOpacity']/100:0.5;
  this.navSizePercent = imgVECfg['navSizePercent'] ? imgVECfg['navSizePercent']:10;
  this.navPositionTop = imgVECfg['navPositionTop'] ? imgVECfg['navPositionTop']:10;
  this.navPositionLeft = imgVECfg['navPositionLeft'] ? imgVECfg['navPositionLeft']:10;
  this.editDiv = imgVECfg['imageEditDiv']?imgVECfg['imageEditDiv']: null;
  this.splitterDiv = $('<div id="'+this.id+'splitter"/>');
  this.propertyMgrDiv = $('<div id="'+this.id+'propManager" class="propertyManager"/>');
  this.splitterDiv.append(imgContainerDiv);
  this.splitterDiv.append(this.propertyMgrDiv);
  $(this.editDiv).append(this.splitterDiv);
  this.splitterDiv.jqxSplitter({ width: '100%',
                                    height: '100%',
                                    orientation: 'vertical',
                                    splitBarSize: 1,
                                    showSplitBar:false,
                                    panels: [{ size: '60%', min: '250', collapsible: false},
                                             { size: '40%', min: '150', collapsed: true, collapsible: true}] });
  this.propMgr = new MANAGERS.PropertyManager({edID: this.id,
                                               propertyMgrDiv: this.propertyMgrDiv,
                                               editor: imgVE,
                                               dataMgr: this.dataMgr,
                                               splitterDiv: this.splitterDiv });
  this.displayProperties = this.propMgr.displayProperties;
  this.imgEditContainer = $('#imgContainerDiv',this.editDiv).get(0);
  this.blnEntity = imgVECfg['baseline']?imgVECfg['baseline']: null;
  this.imgEntity = imgVECfg['imgEntity']?imgVECfg['imgEntity']: null;
  this.navParent = imgVECfg['imageEditDiv']?imgVECfg['imageEditDiv']: document.getElementById('body');
  this.vwPercentRange = { min:20,max:100,inc:2 };
  this.polygons = [];
  this.polygonLookup = {};
  this.fadeColors = {};
  this.selectedPolygons = {};
  this.viewAllPolygons = false; //intially hide any polygons
/*
  if (this.dataMgr && this.dataMgr.entities) {//warninig!!!!! patch until change code to use dataMgr api
    window.entities = this.dataMgr.entities;
    window.trmIDtoLabel = this.dataMgr.termInfo.labelByID;
  }*/
  //create canvas if needed and attach to container
  if (!this.imgCanvas && this.imgEditContainer) {
    this.imgCanvas = document.createElement('canvas');
    this.imgCanvas.tabIndex = 1;
    this.imgEditContainer.appendChild(this.imgCanvas);
    this.imgCanvas.onmouseleave = function(e) {
      var containerClass = e.target.parentNode.className;
      if ($(this).parents('.editContainer')[0] != $(e.relatedTarget).parents('.editContainer')[0]) {
        delete imgVE.focusMode;
//        DEBUG.log("gen"'image canvas has been left '+ containerClass);
//        DEBUG.log("gen"'for '+ (e.relatedTarget ? e.relatedTarget.className :"unknown"));
      }
    };
    this.imgCanvas.onmouseenter = function(e) {
      var containerClass = e.target.parentNode.className;
      if (!imgVE.focusMode) {
        imgVE.focusMode = "mouseIn";
//        DEBUG.log("gen"'image canvas has been entered '+ containerClass);
      }
    };
  }

  if (this.blnEntity && this.blnEntity.segIDs && this.blnEntity.segIDs.length > 0) {
    var i, len = this.blnEntity.segIDs.length;
    for (i=0; i<len; i++) {// add segments to baseline image
      segID = this.blnEntity.segIDs[i];
      segment = this.dataMgr.entities['seg'][segID];
      //WARNING todo add code for multiple polygon boundary
      this.addImagePolygon(segment.boundary[0],"seg"+segID,false,segment['sclIDs'],segment.center);//WARNING!! todo code change boundary can be multiple polygons
    }
  }

  //adjust initial size of image canvas
  if (this.imgEditContainer) {
    this.imgCanvas.width = this.imgEditContainer.clientWidth;
    this.imgCanvas.height = this.imgEditContainer.clientHeight;
    $(this.splitterDiv).on('resize',function(e) {
              DEBUG.log("gen","resize for " + imgVE.imgEditContainer.id + " called");
    });
    $(this.splitterDiv).on('resizePane',function(e,w,h) {
            if (that.initHeight != h || that.initWidth != w) {
              $(that.imgEditContainer).height(h);
              $(that.imgEditContainer).width(w);
              DEBUG.log("gen","resizePane for " + that.imgEditContainer.id + " with w-" + w + " h-"+h+ " initw-" + that.initWidth + " inith-"+that.initHeight);
              that.init();
            } else {
              DEBUG.log("gen","resizePane for " + that.imgEditContainer.id + " image editor skipped - same size initw-" + that.initWidth + " inith-"+that.initHeight);
            }
            return false;
    });
  }
  if (this.blnEntity && this.blnEntity.url) {
    imgSrc = this.blnEntity.url;
  } else if (this.imgEntity && this.imgEntity.url) {
    imgSrc = this.imgEntity.url;
  }
  //setup canvas and context
  this.imgCanvas.className = "imgCanvas";
  this.imgContext = this.imgCanvas.getContext('2d');

  //setup image map navigation tool
  this.navCanvas = document.createElement('canvas');
  this.navContext = this.navCanvas.getContext('2d');
  this.navDIV = document.createElement('div');
  this.navDIV.appendChild(this.navCanvas);
  //position this to the top lefthand corner plus config value or 10 pixels
  this.navDIV.style.left = this.navPositionLeft + 'px';
  this.navDIV.style.top = this.navPositionTop + 'px';
  this.navParent.appendChild(this.navDIV);
  this.zoomDIV = $('<div class="zoomUI"><div id="zoomOut" class="zoomButton">-</div><div id="zoomIn" class="zoomButton">+</div></div>').get(0);
  this.navDIV.appendChild(this.zoomDIV);
  if (imgSrc) {
    imgFilename = imgSrc.substring(imgSrc.lastIndexOf("/")+1);
    this.imgNameDiv = $('<div class="imgNameDiv">'+imgFilename+'</div>').get(0);
    this.navDIV.appendChild(this.imgNameDiv);
  }
  if (!this.image) {
    this.image = new Image();
  }
  this.crossSize = 10;
  if (this.image.width == 0 || this.image.height == 0) { // image not loaded
    this.image.onload = function(e) {
      imgVE.init();
    };
    if (imgSrc) {
      this.image.src = imgSrc;
    } else {
      alert("Failed to load baseline or image due to lack of information");
    }
  } else {//passed in an image and it's loaded
    this.init();
  }
  return this;
};

/**
* put your comment there...
*
* @type Object
*/
EDITORS.ImageVE.prototype = {
  // configure all values that require the dom image and view elements to be loaded first.

/**
* put your comment there...
*
*/

  init: function() {
    this.imgAspectRatio = this.image.width/this.image.height;
    this.initHeight = this.imgEditContainer.clientHeight;
    this.initWidth = this.imgEditContainer.clientWidth;
    this.imgCanvas.width = Math.min((this.imgEditContainer && this.imgEditContainer.clientWidth?this.imgEditContainer.clientWidth:this.imgCanvas.width),this.image.width);
    this.imgCanvas.height = Math.min((this.imgEditContainer && this.imgEditContainer.clientHeight?this.imgEditContainer.clientHeight:this.imgCanvas.height),this.image.height);
    var width = Math.floor(this.imgCanvas.width  * (this.navSizePercent/100)),
        height = Math.floor(this.imgCanvas.width  * (this.navSizePercent/100) /this.imgAspectRatio);
    this.addEventHandlers();
    this.navCanvas.width = width;
    this.navCanvas.height = height;
    this.navDIV.style.width = width + 'px';
    this.navDIV.style.height = (height + 35) + 'px';
    this.navDIV.className = 'navDiv';
    //position this to the righthand side less 20 pixels
//    this.navDIV.style.left =  '' + (this.imgCanvas.width - 20 - width) + 'px';
    this.navDIV.style.left =  this.navPositionLeft + 'px';;
    this.navDIV.style.top =  this.navPositionTop + 'px';
    this.initViewport();
    this.draw();
    this.createStaticToolbar();
  },


/**
* put your comment there...
*
*/

  resize: function () {
    this.init();
  },


/**
* put your comment there...
*
*/

  setFocus: function () {
    this.imgCanvas.focus();
  },


/**
* put your comment there...
*
*/

  savePolygon: function () {
    var imgVE = this, path = imgVE.getPath(),indx;
    if (path && path.length > 2) {
      indx = imgVE.addImagePolygon(path,"new"+imgVE.newPolyCounter++,true);
      imgVE.newPolyIndices.push(indx);
    }
    imgVE.clearPath();
    var i,
        savedata = {seg:[]},
        polygon,
        cnt = imgVE.newPolyIndices.length;
    if (cnt && imgVE.blnEntity) { //save segments to baseline
      var blnID = imgVE.blnEntity.id;
      //for each new or dirty segment polygon
      for(i=0; i<cnt; i++) {
        polygon = imgVE.polygons[imgVE.newPolyIndices[i]-1];
        //build combined data structure calculate url cropped
        savedata.seg.push( {seg_id:polygon.label,seg_baseline_ids:'{'+blnID+'}',//warning seg_id assumes new##  not a seg##  id
                            seg_image_pos:'{"'+JSON.stringify(polygon.polygon).replace(/\[/g,"(").replace(/\]/g,")")+'"}',
                            seg_layer:1,seg_visibility_ids:"{3}"});
      }
      //reset new indices
      imgVE.newPolyIndices = [];
      //save polygon segment
      $.ajax({
          dataType: 'json',
          url: basepath+'/services/saveEntityData.php?db='+dbName,
          data: 'data='+JSON.stringify(savedata),
          asynch: false,
          success: function (data, status, xhr) {
              if (typeof data == 'object' && data.segment && data.segment.success) {
                if (data['segment'].columns &&
                    data['segment'].records[0] &&
                    data['segment'].columns.indexOf('seg_id') > -1) {
                  var record, segID, segIDToTemp = {}, tempID, polygonObj,
                      pkeyIndex = data['segment'].columns.indexOf('seg_id'),
                      blnIdsIndex = data['segment'].columns.indexOf('seg_baseline_ids'),
                      imgPosIndex = data['segment'].columns.indexOf('seg_image_pos'),
                      layerIndex = data['segment'].columns.indexOf('seg_layer');
                  cnt = data['segment'].records.length;
                  for (tempID in data['segment'].tempIDMap) {
                    segIDToTemp[data['segment'].tempIDMap[tempID]] = tempID;
                  }
                  // for each record
                  for(i=0; i<cnt; i++) {
                    record = data['segment'].records[i];
                    segID = record[pkeyIndex];
                    segLabel = 'seg'+segID;
                    // save new info to imgVE.dataMgr.entities[seg][id]
                    if (imgVE.dataMgr.entities && !imgVE.dataMgr.entities.seg) {
                      imgVE.dataMgr.entities['seg'] = {};
                    }
                    imgVE.dataMgr.entities['seg'][segID] = {baselineIDs: record[blnIdsIndex],
                                              boundary: record[imgPosIndex],
                                              center:UTILITY.getCentroid(record[imgPosIndex]),
                                              layer: record[layerIndex],
                                              surfaceID: imgVE.blnEntity.surfaceID,
                                              id:segID
                                              };
                    // add new lookup seg:id for newX index
                    imgVE.polygonLookup[segLabel] = imgVE.polygonLookup[segIDToTemp[segID]];
                    delete imgVE.polygonLookup[segIDToTemp[segID]];
                    // change polygon label of newX and color
                    imgVE.polygons[imgVE.polygonLookup[segLabel]-1].label = segLabel;
                    imgVE.polygons[imgVE.polygonLookup[segLabel]-1].color = "red";
                    imgVE.polygons[imgVE.polygonLookup[segLabel]-1].hidden = true;
                    imgVE.selectedPolygons[segLabel] = 1;
                  }
                  if (imgVE.selectedPolygons && Object.keys(imgVE.selectedPolygons).length == 1) {
                    //enable delete button
                    imgVE.delSegBtn.removeAttr('disabled');
                  } else if (!imgVE.delSegBtn.attr('disabled')){
                    //disable delete button
                    imgVE.delSegBtn.attr('disabled','disabled');
                  }
                  //todo ensure that selected are have unselected color
                  imgVE.selectedPolygons = {};
                  if (imgVE.linkMode) {//user is drawing a new segment for linking scl
                    imgVE.linkMode=false;
                    imgVE.drawImage();
                    imgVE.drawImagePolygons();
                    $('.editContainer').trigger('linkResponse',[imgVE.id,segLabel]);
                  } else {
                    imgVE.drawImage();
                    imgVE.drawImagePolygons();
                  }
                }
                if (data['segment'] && data['segment'].errors && data['segment'].errors.length) {
                  alert("An error occurred while trying to save to a segment record. Error: " + data['segment'].errors.join());
                }
                if (data['error']) {
                  alert("An error occurred while trying to save to a segment record. Error: " + data[error]);
                }
                if (data.entities) {
                  //update data
                  imgVE.dataMgr.updateLocalCache(data,null);
                }
              }
          },// end success cb
          error: function (xhr,status,error) {
              // add record failed.
              alert("An error occurred while trying to save to a segment record. Error: " + error);
          }
      });// end ajax

        //on success update polygons and polygonLooup with segment ids and data
    } else if (cnt && imgVE.imgEntity) { //save baseline
      alert("save code for new baselines is under construction");
    }
  },


/**
* put your comment there...
*
*/

  createStaticToolbar: function () {
    var imgVE = this;
    this.newPolyCounter = 1;
    this.newPolyIndices = [];
    this.viewToolbar = $('<div class="viewtoolbar"/>');
    this.editToolbar = $('<div class="edittoolbar"/>');

    var btnLinkSegName = this.id+'LinkSeg';
    this.linkSegBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton iconbutton" id="'+btnLinkSegName +
                              '" title="Link segment to entity">&#x1F517;</button>'+
                            '<div class="toolbuttonlabel">Link segment</div>'+
                           '</div>');
    $('#'+btnLinkSegName,this.linkSegBtnDiv).unbind('click')
                               .bind('click',function(e) {
      var selectedSeg;
      for ( selectedSeg in imgVE.selectedPolygons) {
        break; //get first key only
      }
      var polygon = imgVE.getImagePolygonByName(selectedSeg);
      if (polygon) {
        if (!polygon.linkIDs) {
          DEBUG.log("event","image segment to link is "+ selectedSeg+" sending link request.");
        }else{
          DEBUG.log("event","image segment to link is "+ selectedSeg + " is already linked to syllables " + polygon.linkIDs.join());
          if (!confirm("Image segment is already linked, would you like to continue?")) {
            DEBUG.log("event","user canceled image segment linking of "+ selectedSeg);
            return;
          }
        }
        alert("Please select a syllable cluster for segment #" + selectedSeg);
        imgVE.linkSource = selectedSeg;
        $('.editContainer').trigger('linkRequest',[imgVE.id,selectedSeg]);
      }else{
        alert("Please select a segmented akṣara before pressing link.");
      }
    });

    var btnSavePolysName = this.id+'saveSeg';
    this.savePolysBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton iconbutton" id="'+btnSavePolysName +
                              '" title="Save image polygon as segment">&#x1F4BE;</button>'+
                            '<div class="toolbuttonlabel">Save polygon</div>'+
                           '</div>');
    $('#'+btnSavePolysName,this.savePolysBtnDiv).unbind('click')
                               .bind('click',function(e) {
                                 imgVE.savePolygon();
    });

    var btnReplacePolyName = this.id+'updateSeg';
    this.replacePolyBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton iconbutton" id="'+btnReplacePolyName +
                              '" title="Replace select segment polygon with new one">&#x25C8;</button>'+
                            '<div class="toolbuttonlabel">Replace polygon</div>'+
                           '</div>');
    $('#'+btnReplacePolyName,this.replacePolyBtnDiv).unbind('click')
                               .bind('click',function(e) {
      if (!Object.keys(imgVE.selectedPolygons).length ||
           Object.keys(imgVE.selectedPolygons).length > 1 ) {
        DEBUG.log("warn","Must select just one segment to be replaced. Aborting!");
        return;
      }
      var selectedPoly, segTag,
          savedata = {seg:[]},
          polygon;
      for (segTag in imgVE.selectedPolygons) {
        selectedPoly = imgVE.polygons[imgVE.polygonLookup[segTag]-1];
        break;
      }
      if (!selectedPoly || (imgVE.dataMgr.entities.seg[selectedPoly.label.substr(3)]).readonly) {
        DEBUG.log("warn","You don't have access to edit selected segment. Aborting!");
//        return;
      }
      polygon = imgVE.getPath();
      if (!polygon || polygon.length < 3) {
        DEBUG.log("warn","You must create a valid replacement polygon before pressing replace. Aborting!");
        return;
      }
      selectedPoly.polygon = polygon;
      selectedPoly.center = UTILITY.getCentroid(polygon);
      //build combined data structure calculate url cropped
      savedata.seg.push( {seg_id:selectedPoly.label.substr(3),//label is tag i.e."seg151"
                          seg_image_pos:'{"'+JSON.stringify(selectedPoly.polygon).replace(/\[/g,"(").replace(/\]/g,")")+'"}',
                         });//WARNING default to logged in users group??
//      return;
      //save synch
      $.ajax({
          dataType: 'json',
          url: basepath+'/services/saveEntityData.php?db='+dbName,
          data: 'data='+JSON.stringify(savedata),
          asynch: false,
          success: function (data, status, xhr) {
            if (typeof data == 'object' &&
                data.segment && data.segment.success &&
                data.segment.columns && data.segment.records[0] &&
                 data.segment.columns.indexOf('seg_id') > -1) {
              var record, segID, segIDToTemp = {}, tempID, polygonObj,
                  pkeyIndex = data.segment.columns.indexOf('seg_id'),
                  blnIdsIndex = data.segment.columns.indexOf('seg_baseline_ids'),
                  imgPosIndex = data.segment.columns.indexOf('seg_image_pos'),
                  layerIndex = data.segment.columns.indexOf('seg_layer');
              if (data.entities) {
                //update data
                imgVE.dataMgr.updateLocalCache(data,null);
              } else {
                record = data['segment'].records[0];
                segID = record[pkeyIndex];
                segLabel = 'seg'+segID;
                // save new info to imgVE.dataMgr.entities[seg][id]
                imgVE.dataMgr.entities['seg'][segID] = {baselineIDs: record[blnIdsIndex],
                                          boundary: record[imgPosIndex],
                                          center:UTILITY.getCentroid(record[imgPosIndex]),
                                          layer: record[layerIndex],
                                          surfaceID: imgVE.blnEntity.surfaceID,
                                          id:segID
                                          };
              }
              // change polygon label of newX and color
              imgVE.drawImage();
              imgVE.drawImagePolygons();
            }
          },// end success cb
          error: function (xhr,status,error) {
              // add record failed.
              alert("An error occurred while trying to replace polygon for segment record. Error: " + error);
          }
      });
    });

    var btnDeleteSegName = this.id+'deleteSeg';
    this.deleteSegBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton iconbutton" id="'+btnDeleteSegName +
                              '" title="Delete selected segments">-</button>'+
                            '<div class="toolbuttonlabel">Delete Segment</div>'+
                           '</div>');
    this.delSegBtn = $('#'+btnDeleteSegName,this.deleteSegBtnDiv);
    this.delSegBtn.unbind('click')
                  .bind('click',function(e) {
      var i,
          deldata = {seg:[]},
          polygon,
          cnt = Object.keys(imgVE.selectedPolygons).length;
      if (cnt > 1) { //delete segments to baseline
        alert("Deletion of multiple segments is not currently supported. Please select one at a time.");
      } else if (cnt == 1 && imgVE.blnEntity) { //delete segment from baseline
        var blnID = imgVE.blnEntity.id,
            segTag = Object.keys(imgVE.selectedPolygons)[0],
            segment = imgVE.dataMgr.getEntityFromGID(segTag);
        if (segment.sclIDs && segment.sclIDs.length > 0) {
         if (!confirm("You are about to remove a segment that is linked to 1 or more syllables,"+
                      " would you like to proceed?")) {
           return;
         }
        }
        deldata.seg = [segment.id];
        //delete
        $.ajax({
            dataType: 'json',
            url: basepath+'/services/deleteEntity.php?db='+dbName,
            data: 'data='+JSON.stringify(deldata),
            asynch: true,
            success: function (data, status, xhr) {
                var segID = segment.id, segLabel = segTag;
                if (typeof data == 'object' && data.success) {
                  //remove polygon
                  imgVE.removeImagePolygon(segLabel);
                  delete imgVE.selectedPolygons[segLabel];
                  if (imgVE.selectedPolygons && Object.keys(imgVE.selectedPolygons).length == 1) {
                    //enable delete button
                    imgVE.delSegBtn.removeAttr('disabled');
                  } else if (!imgVE.delSegBtn.attr('disabled')){
                    //disable delete button
                    imgVE.delSegBtn.attr('disabled','disabled');
                  }
                  //reset new indices
                  imgVE.drawImage();
                  imgVE.drawImagePolygons();
                  //remove segment from cache
                  imgVE.dataMgr.removeEntityFromCache('seg',segID);
                }
            }
        });
      }
    });
    this.delSegBtn.attr('disabled','disabled');

    if (this.blnEntity) {
      var btnShowSegName = this.id+'ShowSeg';
      this.showSegBtnDiv = $('<div class="toolbuttondiv">' +
                              '<button class="toolbutton" id="'+btnShowSegName +
                                '" title="Show image segments">Show</button>'+
                              '<div class="toolbuttonlabel">Segment display</div>'+
                             '</div>');
      $('#'+btnShowSegName,this.showSegBtnDiv).unbind('click')
                                 .bind('click',function(e) {
        if ( this.textContent == "Show") {
          imgVE.viewAllPolygons = true;
          this.textContent = "Hide";
          this.title = "Hide image segments";
        } else {
          imgVE.viewAllPolygons = false;
          this.textContent = "Show";
          this.title = "Show image segments";
        }
        imgVE.drawImage();
        imgVE.drawImagePolygons();
      });
    }


    var btnImgInvertName = this.id+'ImgInvert';
    this.imgInvertBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton" id="'+btnImgInvertName +
                              '" title="Invert image colors">Invert</button>'+
                            '<div class="toolbuttonlabel">Invert image</div>'+
                           '</div>');
    $('#'+btnImgInvertName,this.imgInvertBtnDiv).unbind('click')
                               .bind('click',function () {imgVE.invert()});

    var btnImgStretchName = this.id+'ImgStretch';
    this.imgStretchBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton" id="'+btnImgStretchName +
                              '" title="Revert to original image">+</button>'+
                            '<div class="toolbuttonlabel">Contrast</div>'+
                           '</div>');
    $('#'+btnImgStretchName,this.imgStretchBtnDiv).unbind('click')
                               .bind('click',function () {imgVE.stretch()});

    var btnImgReduceName = this.id+'ImgReduce';
    this.imgReduceBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton" id="'+btnImgReduceName +
                              '" title="Reduce image color value (fixed precentage)">&#x2012;</button>'+
                            '<div class="toolbuttonlabel">Contrast</div>'+
                           '</div>');
    $('#'+btnImgReduceName,this.imgReduceBtnDiv).unbind('click')
                               .bind('click',function () {imgVE.reduce()});

    var btnImgEmbossName = this.id+'ImgEmboss';
    this.imgEmbossBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton" id="'+btnImgEmbossName +
                              '" title="Convert color changes to embossing">Emboss</button>'+
                            '<div class="toolbuttonlabel">Emboss image</div>'+
                           '</div>');
    $('#'+btnImgEmbossName,this.imgEmbossBtnDiv).unbind('click')
                               .bind('click',function () {imgVE.emboss()});

    var btnImgNormalName = this.id+'ImgNormal';
    this.imgNormalBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton" id="'+btnImgNormalName +
                              '" title="Revert to original image">Normal</button>'+
                            '<div class="toolbuttonlabel">Reset image</div>'+
                           '</div>');
    $('#'+btnImgNormalName,this.imgNormalBtnDiv).unbind('click')
                               .bind('click', function () {
                                                imgVE.drawImage();
                                                imgVE.clearImageCommands();
                                              });
    var btnImgFadeName = this.id+'ImgFade';
    this.imgFadeBtnDiv = $('<div class="toolbuttondiv">' +
                            '<button class="toolbutton" id="'+btnImgFadeName +
                              '" title="Fade selected colors on entire image">Fade</button>'+
                            '<div class="toolbuttonlabel">Fade image</div>'+
                           '</div>');
    $('#'+btnImgFadeName,this.imgFadeBtnDiv).unbind('click')
                               .bind('click',function () {imgVE.fade()});
    if (this.blnEntity) {
      this.viewToolbar.append(this.showSegBtnDiv);
    }
    this.viewToolbar.append(this.imgInvertBtnDiv)
                .append(this.imgStretchBtnDiv)
                .append(this.imgReduceBtnDiv)
//                .append(this.imgEmbossBtnDiv)
                .append(this.imgFadeBtnDiv)
                .append(this.imgNormalBtnDiv);
    this.layoutMgr.registerViewToolbar(this.id,this.viewToolbar);
    this.editToolbar.append(this.linkSegBtnDiv)
                .append(this.savePolysBtnDiv)
                .append(this.replacePolyBtnDiv)
                .append(this.deleteSegBtnDiv);
    this.layoutMgr.registerEditToolbar(this.id,this.editToolbar);
  },


/**
* put your comment there...
*
*/

  initViewport: function () {
    this.navAspectRatio = this.imgCanvas.width/this.imgCanvas.height;
    var vpWidth  = Math.floor(this.navCanvas.width * this.vwPercent/100),
        vpHeight = Math.floor(vpWidth/this.navAspectRatio);
    if (vpHeight > this.navCanvas.height) {
      vpHeight = this.navCanvas.height;
      vpWidth = Math.floor(vpHeight * this.navAspectRatio);
    }
    this.vpMaxLoc = { x: this.navCanvas.width - vpWidth, y: this.navCanvas.height - vpHeight };
//    this.vpLoc = { x: Math.min(this.vwOffset.x * this.vwPercent, this.vpMaxLoc.x) || 0,
    this.vpLoc = { x:  this.vpMaxLoc.x,
      y: Math.min( this.vwOffset.y * this.vwPercent, this.vpMaxLoc.y) || 0 };
    this.vpSize = { width: vpWidth || 50, height: vpHeight || 50 };
    this.vpLastLoc =  { x: 0, y: 0 };
  },


/**
* put your comment there...
*
* @param polygons
*/

  setImagePolygons: function (polygons) {
    //todo add code to validate the polygon array
    this.polygons = polygons;
  },


/**
* put your comment there...
*
* @param polygons
*/

  getImagePolygons: function (polygons) {
    //todo add code to validate the polygon array
    return this.polygons;
  },


/**
* put your comment there...
*
* @param index
*/

  getImagePolygonAt: function (index) {
    if (index == 0 || isNaN(index) || index > this.polygons.length) return null;
    return this.polygons[index-1];
  },


/**
* put your comment there...
*
* @param label
*/

  getImagePolygonByName: function (label) {
    var index = this.polygonLookup[label];
    return this.polygons[index-1];
  },


/**
* put your comment there...
*
* @param label
*/

  getIndexbyPolygonName: function (label) {
    return this.polygonLookup[label];
  },


/**
* put your comment there...
*
* @param polygon
* @param label
* @param visible
* @param linkIDs
* @param center
*/

  addImagePolygon: function (polygon,label,visible,linkIDs,center) {
    //todo add code to validate the polygon
    var clr = "green";
    if (!linkIDs){
      clr = "red";
    }
    this.polygons.push({polygon:polygon,
                        center: center?center:UTILITY.getCentroid(polygon),
                        color:clr,
                        width:1, //polygon width
                        label:label,
                        hidden:(visible?false:true),
                        linkIDs:linkIDs});
    this.polygonLookup[label] = this.polygons.length;
    return this.polygons.length;
  },


/**
* put your comment there...
*
* @param label
*/

  removeImagePolygon: function (label) {
    //todo add code to validate the polygon
    var i = this.polygonLookup[label],pIndex = i-1, polygon, segTag;
    if (i && this.polygons.length >= i){
      for (;i < this.polygons.length; i++) {
        polygon = this.polygons[i];
        segTag = polygon.label;
        this.polygonLookup[segTag] = this.polygonLookup[segTag]-1;
      }
      delete this.polygonLookup[label];
      this.polygons.splice(pIndex,1);
    }
  },


/**
* put your comment there...
*
* @returns {Array}
*/

  getSelectedPolygonLabels: function () {
    var labels = [],i;
    for(i in this.selectedPolygons) {
      labels.push(i);
    }
    return labels;
  },


/**
* put your comment there...
*
* @param label
*/

  selectPolygonByName: function (label) {
    if (this.polygonLookup[label]) {
      this.selectedPolygons[label] = 1;
    }
  },


/**
* put your comment there...
*
*/

  unselectAllPolygons: function () {
    this.selectedPolygons ={};
  },


/**
* put your comment there...
*
* @param index
* @param hilite
*/

  setImagePolygonHilite: function(index,hilite){
    if (index == 0 || isNaN(index) || index > this.polygons.length) return;
    if (hilite || hilite === false) {
      this.polygons[index-1].hilite = hilite;
    }
  },


/**
* put your comment there...
*
* @param index
* @param color
* @param width
* @param show
*/

  setImagePolygonDisplay: function (index,color,width,show) {
    if (index == 0 || isNaN(index) || index > this.polygons.length) return;
    if (color) {
      this.polygons[index-1].color = (color?color:"green");
    }
    if (width) {
      this.polygons[index-1].width = (width?width:1);
    }
    if (show || show === false) {
      this.polygons[index-1].hidden = !show;
    }
  },


/**
* put your comment there...
*
*/

  getImageSrc: function () {
    return this.image.src;
  },


/**
* put your comment there...
*
* @param src
*/

  setImageSrc: function (src) {//note that this will trigger onload which calls init.
    this.image.src = src;
  },


/**
* put your comment there...
*
*/

  scaleViewport: function () {
    var width  = Math.floor(this.navCanvas.width * this.vwPercent/100),
        height = Math.floor(width/this.navAspectRatio);
    if (height > this.navCanvas.height) {
      height = this.navCanvas.height;
      width = Math.floor(height * this.navAspectRatio);
    }
    this.vpMaxLoc = { x: this.navCanvas.width - width, y: this.navCanvas.height - height };
    this.vpSize = { width: width || 50, height: height || 50 };
  },


/**
* put your comment there...
*
* @param mouse
* @param offset
*/

  moveViewport: function(mouse, offset) {
    this.vpLoc.x = Math.max(0, Math.min(mouse[0] - offset[0], this.vpMaxLoc.x));
    this.vpLoc.y = Math.max(0, Math.min(mouse[1] - offset[1], this.vpMaxLoc.y));
    this.vpLastLoc.x = this.vpLoc.x;
    this.vpLastLoc.y = this.vpLoc.y;
  },


/**
* put your comment there...
*
* @param deltaX
* @param deltaY
*/

  moveViewportRelative: function(deltaX, deltaY) {
    this.vpLoc.x = Math.max(0, Math.min(this.vpLastLoc.x + deltaX, this.vpMaxLoc.x));
    this.vpLoc.y = Math.max(0, Math.min(this.vpLastLoc.y + deltaY, this.vpMaxLoc.y));
    this.vpLastLoc.x = this.vpLoc.x;
    this.vpLastLoc.y = this.vpLoc.y;
  },


/**
* put your comment there...
*
* @param deltaX
* @param deltaY
*/

  moveNavPanelRelative: function(deltaX, deltaY) {
    var left = this.navPositionLeft, minLeft = 4, //remember that highlighted border witdh
        top = this.navPositionTop, minTop = 4,
        width =  parseInt(this.navDIV.style.width),
        maxLeft = Math.max(minLeft,(this.imgCanvas.width - width)),
        height = parseInt(this.navDIV.style.height),
        maxTop = Math.max(minTop,(this.imgCanvas.height - height));

    this.navPositionLeft = Math.max(minLeft, Math.min(left + deltaX, maxLeft));
    this.navPositionTop = Math.max(minTop, Math.min(top + deltaY, maxTop));
    this.navDIV.style.left = this.navPositionLeft + "px";
    this.navDIV.style.top = this.navPositionTop + "px";
  },


/**
* put your comment there...
*
* @param posY
*/

  moveViewportToImagePosY: function(posY) {
    this.vpLoc.y = posY * this.navCanvas.height / this.image.height;
    this.vpLastLoc.y = this.vpLoc.y;
  },


/**
* put your comment there...
*
*/

  eraseNavPanel: function() {
    this.navContext.clearRect(0,0,this.navCanvas.width,this.navCanvas.height);
  },


/**
* put your comment there...
*
* @param refViewCorner
*/

  findVisiblePoly: function (refViewCorner) {
    var imgVE = this,
        x = imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width,
        y = imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height,
        xmax = (imgVE.vpSize.width + imgVE.vpLoc.x) * imgVE.image.width / imgVE.navCanvas.width,
        ymax = (imgVE.vpSize.height + imgVE.vpLoc.y) * imgVE.image.height / imgVE.navCanvas.height,
        xpos,ypos,candidatePoly = null, minDist = 1000, i, polygon, dist;
    switch (refViewCorner) {
      case "bottomleft":
          xpos = x;
          ypos = ymax;
        break;
      case "bottomright":
          xpos = xmax;
          ypos = ymax;
        break;
      case "topleft":
          xpos = x;
          ypos = y;
        break;
      case "topright":
      default:
          xpos = xmax;
          ypos = y;
        break;
    }
    //foreach polygon
    for (i=0; i < this.polygons.length; i++) {
      polygon = this.polygons[i];
      xctr = polygon.center[0];
      yctr = polygon.center[1];
      //if visible
      if ( !isNaN(xctr) && !isNaN(yctr) && x <= xctr && xctr <= xmax&& y <= yctr && yctr <= ymax) {
        //find distance
        dist = Math.sqrt((xctr - xpos)*(xctr - xpos)+(yctr - ypos)*(yctr - ypos));
        //if distance is min the save as candidate
        if (dist < minDist) {
          candidatePoly = polygon;
          minDist = dist;
        }
      }
    }
    DEBUG.log("data","Found visible Segment #"+candidatePoly.label+" in "+refViewCorner);
    return candidatePoly;
  },


/**
* put your comment there...
*
* @param ctx
* @param x
* @param y
* @param rx
* @param ry
* @param rw
* @param rh
*/

  pointInRect: function (ctx, x, y, rx, ry, rw, rh) {
    ctx.beginPath();
    ctx.rect( rx, ry, rw, rh);
    return ctx.isPointInPath(x, y);
  },


/**
* put your comment there...
*
* @param ctx
* @param x
* @param y
* @param path
*/

  pointInPath: function (ctx, x, y,path) {
    ctx.beginPath();
    ctx.moveTo(path[0][0],path[0][1]);
    for (i=1; i < path.length; i++) {
      ctx.lineTo(path[i][0],path[i][1]);
    }
    ctx.closePath();
    return ctx.isPointInPath(x, y);
  },


/**
* put your comment there...
*
* @param x
* @param y
*
* @returns {Array}
*/

  hitTestPolygons: function ( x, y) {
    var i,polygonObj, hitPolyIndices = [],
        cnt = this.polygons.length;
    for (i=0; i < cnt; i++) {
      polygonObj = this.polygons[i];
      if (this.pointInPath(this.imgContext,x,y,polygonObj.polygon)) {
        hitPolyIndices.push(i+1);// indices are store from 1 array is zero based
      }
    }
    return hitPolyIndices;
  },


/**
* put your comment there...
*
* @param event
* @param canvas
*
* @returns {Array}
*/

  eventToCanvas: function(event,canvas) {
    var bbox = canvas.getBoundingClientRect();
    return [Math.round(event.clientX - bbox.left * (canvas.width  / bbox.width)),
            Math.round(event.clientY - bbox.top  * (canvas.height / bbox.height))];
  },


/**
* put your comment there...
*
* @param object e System event object
*/

  handleWheel: function (e) {
    DEBUG.log("gen", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE handleWheel "+this.id+" with delta "+e.deltaX+","+e.deltaY);
    var e = window.event || e; // old IE
    var delta = Math.max(-1, Math.min(1, (e.deltaY || e.wheelDelta || -e.detail.y)));//detect direction
    if (isNaN(delta)) {
      e.preventDefault();
      return;
    }
    var xScaleFactor = e.layerX/this.imgCanvas.width,
        yScaleFactor = e.layerY/this.imgCanvas.height,
    xNavAllign = xScaleFactor * this.vpSize.width + this.vpLoc.x,
    yNavAllign = yScaleFactor * this.vpSize.height + this.vpLoc.y;
    this.vwPercent = Math.max(this.vwPercentRange.min,
                              Math.min(this.vwPercentRange.max,this.vwPercent + ( this.vwPercentRange.inc * delta)));
    this.scaleViewport();
    var xNew = Math.round(xNavAllign - xScaleFactor * this.vpSize.width),
        yNew = Math.round(yNavAllign - yScaleFactor * this.vpSize.height);
    this.eraseNavPanel();
    this.moveViewport([xNew,yNew], [0,0]);
    this.draw();
    DEBUG.log("gen", "delta="+delta+
                      "xScaleFactor="+xScaleFactor+
                      "yScaleFactor="+yScaleFactor+
                      "xNavAllign="+xNavAllign+
                      "yNavAllign="+yNavAllign+
                      "xNew="+xNew+
                      "yNew="+yNew+
                      "vwPercent="+this.vwPercent);
    e.preventDefault();//stop window scroll, for dual purpose could use CTRL key to disallow default
  },


/**
* put your comment there...
*
* @param direction
*/

  zoomCenter: function (direction) {
    var xNavAllign = this.vpSize.width/2 + this.vpLoc.x,
        yNavAllign = this.vpSize.height/2 + this.vpLoc.y;
    this.vwPercent = Math.max(this.vwPercentRange.min,
                              Math.min(this.vwPercentRange.max,this.vwPercent + ( this.vwPercentRange.inc * direction)));
    this.scaleViewport();
    var xNew = Math.round(xNavAllign - this.vpSize.width/2),
        yNew = Math.round(yNavAllign - this.vpSize.height/2);
    this.eraseNavPanel();
    this.moveViewport([xNew,yNew], [0,0]);
    this.draw();
//    e.preventDefault();//stop window scroll, for dual purpose could use CTRL key to disallow default
  },


/**
*
*/

  addEventHandlers: function() {
    var imgVE = this;
  // navDiv events
    //mousedown
    $(imgVE.navDIV).unbind("mousedown touchstart").bind("mousedown touchstart", function(e) {
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE nav "+imgVE.id);
      var pt = imgVE.eventToCanvas(e,imgVE.navCanvas),
      offset = null;
      e.preventDefault();

      if (imgVE.pointInRect(imgVE.navContext,
                                      pt[0], pt[1],
                                      imgVE.vpLoc.x,
                                      imgVE.vpLoc.y,
                                      imgVE.vpSize.width,
                                      imgVE.vpSize.height)) {// start viewport drag
        startPoint = [pt[0] - imgVE.vpLoc.x,
                      pt[1] - imgVE.vpLoc.y];

        $(imgVE.navCanvas).bind("mousemove touchmove", function(e) {// move viewport
          DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE nav "+imgVE.id);
          imgVE.eraseNavPanel();

          imgVE.moveViewport(imgVE.eventToCanvas(e,imgVE.navCanvas), startPoint);

          imgVE.draw();
        });

        $(imgVE.navCanvas).bind("mouseup touchend", function(e) {//end drag button up
          DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE nav "+imgVE.id);
          $(imgVE.navCanvas).unbind("mousemove touchmove");
          $(imgVE.navCanvas).unbind("mouseup touchend");
          if ($('body').hasClass('synchScroll')) {
            poly = imgVE.findVisiblePoly('topright');
            $('.editContainer').trigger('synchronize',[imgVE.id,poly.label,0]);
          }
        });

        imgVE.navCanvas.onmouseout = function(e) {//end drag mouse out of navDiv
          DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE nav "+imgVE.id);
          //imgVE.navCanvas.onmousemove = undefined;
          //imgVE.navCanvas.onmouseup = undefined;
        };

      }
    });
    imgVE.navCanvas.onwheel = function(e) {
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE nav "+imgVE.id);
      imgVE.handleWheel.call(imgVE,e); //delegate passing imgVE as context
    };

    imgVE.navCanvas.onmousewheel = function(e) {
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE nav "+imgVE.id);
      imgVE.handleWheel.call(imgVE,e); //delegate passing imgVE as context
    };

    $('#zoomOut',imgVE.zoomDIV).unbind('click').bind('click', function(e) {
        setTimeout(function() {imgVE.zoomCenter.call(imgVE,1);},50);
      });

    $('#zoomIn',imgVE.zoomDIV).unbind('click').bind('click', function(e) {
        setTimeout(function() {imgVE.zoomCenter.call(imgVE,-1);},50);
      });

  //image canvas events
    // wheel zoom
    imgVE.imgCanvas.onwheel = function(e) {
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE canvas "+imgVE.id);
      imgVE.handleWheel.call(imgVE,e); //delegate passing imgVE as context
    }
    imgVE.imgCanvas.onmousewheel = function(e) {
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE canvas "+imgVE.id);
      imgVE.handleWheel.call(imgVE,e); //delegate passing imgVE as context
    };
    imgVE.imgCanvas.onkeydown = function(e) {
      var keyCode = (e.keyCode || e.which);
      if (keyCode > 36 && keyCode <41) {
        switch (e.keyCode || e.which) {
          case 38://'Up':
            if (e.ctrlKey || e.metaKey) {
              imgVE.moveNavPanelRelative(0,-5);
            } else {
              imgVE.moveViewportRelative(0,-1);
            }
            break;
          case 40://'Down':
            if (e.ctrlKey || e.metaKey) {
              imgVE.moveNavPanelRelative(0,5);
            } else {
              imgVE.moveViewportRelative(0,1);
            }
            break;
          case 37://"Left":
            if (e.ctrlKey || e.metaKey) {
              imgVE.moveNavPanelRelative(-3,0);
            } else {
              imgVE.moveViewportRelative(-1,0);
            }
            break;
          case 39://"Right":
            if (e.ctrlKey || e.metaKey) {
              imgVE.moveNavPanelRelative(3,0);
            } else {
              imgVE.moveViewportRelative(1,0);
            }
            break;
        }
        imgVE.draw();
        e.stopImmediatePropagation();
        return false;
      }else if (keyCode == 77 && (e.ctrlKey || e.metaKey)) { //ctrl + m
        imgVE.navDIV.hidden = !imgVE.navDIV.hidden; //toggle navPanel
        e.stopImmediatePropagation();
        return false;
      }
    };
    imgVE.imgCanvas.onkeypress = function(e) {
      var key = e.which == null?String.fromCharCode(e.keyCode):
                (e.which != 0 )?String.fromCharCode(e.which):null;
//      alert('-keypress img in imageVE '+key);
      if (key == '+') {
        imgVE.zoomCenter.call(imgVE,-1);
      } else if (key == '-'){
        imgVE.zoomCenter.call(imgVE,1);
      } else if (key == 's' && (e.ctrlKey || e.metaKey)) {
        imgVE.savePolygon();
        e.stopImmediatePropagation();
        return false;
      }
    };

/*    // keydown
    imgVE.imgEditContainer.onkeydown = function(e) {
      if (e.ctrl) {
        //set cursor to grab
        imgVE.imgCanvas.style.cursor = 'grab';
      }
    };

    // keyup
    imgVE.imgEditContainer.onkeyup = function(e) {
      if (e.ctrl) {
        //set cursor to grab
        imgVE.imgCanvas.style.cursor = 'crosshair';
      }
    };
*/
    imgVE.segMode = "done";
    imgVE.imgCanvas.ondblclick = function (e){
      var pt = imgVE.eventToCanvas(e, imgVE.imgCanvas);
      //adjust point to be image coordinates
      var x = (imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width + imgVE.vpSize.width/imgVE.navCanvas.width*imgVE.image.width * pt[0]/imgVE.imgCanvas.width),
          y = (imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height + imgVE.vpSize.height/imgVE.navCanvas.height*imgVE.image.height * pt[1]/imgVE.imgCanvas.height),
          i,index,gid;
      //hittest for target polygons
      var hitPolyIndices = imgVE.hitTestPolygons(x,y);
      //unselect existing if no ctrl key pressed
      if (!e.ctrlKey) {
        imgVE.selectedPolygons = {};
      }
      //add indices to selected array
      for (i=0; i < hitPolyIndices.length; i++) {
        index = hitPolyIndices[i];
        gid = imgVE.polygons[index -1].label;
        imgVE.propMgr.showVE(null,gid);
        imgVE.selectedPolygons[gid] = 1;
//        imgVE.selectedPolygons[index] = 1;
      }
      if (imgVE.selectedPolygons && Object.keys(imgVE.selectedPolygons).length > 0) {
        if ( Object.keys(imgVE.selectedPolygons).length == 1) {
          //enable delete button
          imgVE.delSegBtn.removeAttr('disabled');
        } else {//check for duplicate overlaying polygons
          selectedTags = Object.keys(imgVE.selectedPolygons);
          firstPoly = imgVE.polygons[imgVE.polygonLookup[selectedTags[0]]-1];
          firstPolyVerts = firstPoly.polygon.join();
          for (i = 1; i < selectedTags.length; i++) {
            testPoly = imgVE.polygons[imgVE.polygonLookup[selectedTags[i]]-1];
            if (testPoly.polygon.join() == firstPolyVerts) {
              delete imgVE.selectedPolygons[selectedTags[i]];
            }
          }
          if (Object.keys(imgVE.selectedPolygons).length == 1) {
            //enable delete button
            imgVE.delSegBtn.removeAttr('disabled');
          } else if (!imgVE.delSegBtn.attr('disabled') && Object.keys(imgVE.selectedPolygons).length > 1){
            //disable delete button
            imgVE.delSegBtn.attr('disabled','disabled');
          }
        }
      }
      //redraw
      imgVE.drawImage();
      imgVE.drawImagePolygons();
      if (imgVE.linkMode) {
        $('.editContainer').trigger('linkResponse',[imgVE.id,imgVE.getSelectedPolygonLabels()[0]]);
      } else {
        $('.editContainer').trigger('updateselection',[imgVE.id,imgVE.getSelectedPolygonLabels()]);
      }
    };

    imgVE.imgCanvas.onclick = function (e){
      var pt = imgVE.eventToCanvas(e, imgVE.imgCanvas);
      //adjust point to be image coordinates
      var x = (imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width + imgVE.vpSize.width/imgVE.navCanvas.width*imgVE.image.width * pt[0]/imgVE.imgCanvas.width),
          y = (imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height + imgVE.vpSize.height/imgVE.navCanvas.height*imgVE.image.height * pt[1]/imgVE.imgCanvas.height),
          i,index;
      if (imgVE.focusMode != 'focused') {
        imgVE.focusMode = 'focused';
        imgVE.imgCanvas.focus();
        imgVE.layoutMgr.curLayout.trigger('focusin',imgVE.id);
      }
      if (e.ctrlKey) { //user selecting or finishing drag navigation
        //set cursor back to pointer ???
        //hittest for target polygons
        var hitPolyIndices = imgVE.hitTestPolygons(x,y);
        //add indices to selected array
        for (i=0; i < hitPolyIndices.length; i++) {
          index = hitPolyIndices[i];
          imgVE.selectedPolygons[imgVE.polygons[index -1].label] = 1;
//          imgVE.selectedPolygons[index] = 1;
        }
        //redraw
        if (imgVE.linkMode) {
          imgVE.linkMode=false;
          imgVE.drawImage();
          imgVE.drawImagePolygons();
          $('.editContainer').trigger('linkResponse',[imgVE.id,imgVE.getSelectedPolygonLabels()[0]]);
        } else {
          imgVE.drawImage();
          imgVE.drawImagePolygons();
          $('.editContainer').trigger('updateselection',[imgVE.id,imgVE.getSelectedPolygonLabels()]);
        }
        return;
      }else if (e.altKey) { //user wants set start point for path
        imgVE.path = [[x,y]];
        imgVE.segMode = "path";
        imgVE.redrawPath();
      }else if (imgVE.segMode == "path"){
        if ( imgVE.path && imgVE.path.length > 2 && //user click on start point so end polygon draw
            Math.abs(imgVE.path[0][0] - x) <= 3 *imgVE.image.width/imgVE.imgCanvas.width*imgVE.vwPercent/100 &&
            Math.abs(imgVE.path[0][1] - y)<= 3 *imgVE.image.height/imgVE.imgCanvas.height*imgVE.vwPercent/100) {
          imgVE.segMode = "done";
          imgVE.redrawPath();
        }else{ //add point to path
          imgVE.path.push([x,y]);
          imgVE.redrawPath();
        }
      }else if (imgVE.path && imgVE.path.length>0){
//        imgVE.path = null;
//        imgVE.drawImage();
      }
    };
    imgVE.rbRect,imgVE.drgStart,imgVE.rbImageData = null;
    $(imgVE.imgCanvas).unbind("mousedown touchstart").bind("mousedown touchstart", function (e){
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE canvas "+imgVE.id);
      if (e.ctrlKey) { //user wants to drag navigation
        //set cursor to grabbing and flag dragnavigation
        imgVE.imgCanvas.style.cursor = 'pointer';
        imgVE.dragnav = 'down';
        //store drag start
        return;
      }
      if (imgVE.segMode == "path"){//likely that the user is clicking a new vertice
        return;
      }else if (imgVE.rbImageData && imgVE.rbRect) {
        imgVE.imgContext.putImageData(imgVE.rbImageData,imgVE.rbRect[0][0], imgVE.rbRect[0][1]);
        imgVE.rbImageData = null;
      }
      if (imgVE.path) {
        imgVE.path = null;
        imgVE.draw();
      }
      imgVE.drgStart = imgVE.eventToCanvas(e, imgVE.imgCanvas);
      imgVE.rbRect = [imgVE.drgStart];
      e.preventDefault();
      imgVE.segMode = "rect";
    });
    $(imgVE.imgCanvas).unbind("mousemove touchmove").bind("mousemove touchmove", function (e){
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE canvas "+imgVE.id);
      if (e.ctrlKey && e.buttons == 1) { // ctrl+left mouse button with move user is drag navigation
        imgVE.dragnav = 'move';
        imgVE.imgCanvas.style.cursor = 'grabbing';
        //adjust picture postion
        //save new location
        return;
      }else{
        imgVE.imgCanvas.style.cursor = 'crosshair';
        delete imgVE.dragnav;
      }
      if (imgVE.segMode == "path"){
        return;
      } else if (imgVE.segMode == "rect") {//dragging for rubberband select
        //redraw saved pixels
        if (imgVE.rbImageData && imgVE.rbRect) {
          imgVE.imgContext.putImageData(imgVE.rbImageData,imgVE.rbRect[0][0], imgVE.rbRect[0][1]);
          imgVE.rbImageData = null;
        }
        //capture new corner
        var pt = imgVE.eventToCanvas(e, imgVE.imgCanvas);
        imgVE.rbRect[0] = [Math.min(pt[0],imgVE.drgStart[0]), Math.min(pt[1],imgVE.drgStart[1])];
        imgVE.rbRect[1] = [Math.abs(pt[0]-imgVE.drgStart[0]), Math.abs(pt[1]-imgVE.drgStart[1])];
        //if rect large enough capture pixels and draw rect
        if (imgVE.rbRect[1][0] >2 && imgVE.rbRect[1][1] > 2 ) {
          imgVE.rbImageData = imgVE.imgContext.getImageData(imgVE.rbRect[0][0],imgVE.rbRect[0][1],imgVE.rbRect[1][0],imgVE.rbRect[1][1]);
          var lw = imgVE.imgContext.lineWidth;
          imgVE.imgContext.strokeRect(imgVE.rbRect[0][0]+lw,
                                          imgVE.rbRect[0][1]+lw,
                                          imgVE.rbRect[1][0]-2*lw,
                                          imgVE.rbRect[1][1]-2*lw);
        }
      }
    });
    $(imgVE.imgCanvas).unbind("mouseup touchend").bind("mouseup touchend", function (e){
      DEBUG.log("event", "type: "+e.type+(e.code?" code: "+e.code:"")+" in imageVE canvas "+imgVE.id);
      if (e.ctrlKey) { // || isDragNavigation ) { //user ending drag navigation
        //close flag
        //reset cursor to grab if ctrl else to pointer
        if (imgVE.dragnav == 'move') {
          imgVE.dragnav = 'up';
          imgVE.imgCanvas.style.cursor = 'crosshair';
          e.stopImmediatePropagation();
        }else{
          delete imgVE.dragnav;
          imgVE.imgCanvas.style.cursor = 'pointer';
        }
        if (imgVE.segMode == "rect") {
          imgVE.segMode = "done";
          imgVE.imgCanvas.style.cursor = 'crosshair';
          e.stopImmediatePropagation();
        }
        return;
      }
      if (imgVE.segMode == "path"){
        return;
      } else if (imgVE.segMode == "rect") {
        //if large enough move rect to imgVE path and redraw
        if (imgVE.rbRect[1] && imgVE.rbRect[1].length > 1 && imgVE.rbRect[1][0] >2 &&  imgVE.rbRect[1][1] > 2 ) {
          var lw = imgVE.imgContext.lineWidth;
          var x = (imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width + imgVE.vpSize.width/imgVE.navCanvas.width*imgVE.image.width * (imgVE.rbRect[0][0]+lw)/imgVE.imgCanvas.width),
              y = (imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height + imgVE.vpSize.height/imgVE.navCanvas.height*imgVE.image.height * (imgVE.rbRect[0][1]+lw)/imgVE.imgCanvas.height),
              w = (imgVE.vpSize.width/imgVE.navCanvas.width*imgVE.image.width * (imgVE.rbRect[1][0]-2*lw)/imgVE.imgCanvas.width),
              h = (imgVE.vpSize.height/imgVE.navCanvas.height*imgVE.image.height * (imgVE.rbRect[1][1]-2*lw)/imgVE.imgCanvas.height);
          imgVE.path = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
//        }else if (imgVE.rbImageData && imgVE.rbRect) {//else redraw saved pixels
//          imgVE.imgContext.putImageData(imgVE.rbImageData,imgVE.rbRect[0][0], imgVE.rbRect[0][1]);
        }
        //clean up
        imgVE.imgCanvas.style.cursor = 'crosshair';
        e.stopImmediatePropagation();
        imgVE.rbImageData = null;
        imgVE.rbRect = null;
        imgVE.drgStart = null;
        imgVE.segMode = "done";
        imgVE.draw();
      }
    });

    /**
    *
    * linkRequestHandler sets state variables so that the imageVE will  show segments and
    * repond upon creattion or selection of a segment to this link request
    *
    * @param e event object
    * @param senderID
    * @param linkSource
    * @param autoAdvance
    */

    function linkRequestHandler(e,senderID, linkSource, autoAdvance) {
      if (senderID == imgVE.id) {
        return;
      }
      DEBUG.log("event","link request received by imageVE in "+imgVE.id+" from "+senderID+" with source "+ linkSource + (autoAdvance?" with autoAdvance on":""));
      imgVE.linkMode = true;
      imgVE.autoLink = autoAdvance? true : false;
      imgVE.drawImage();
      imgVE.drawImagePolygons();
    };

    $(imgVE.editDiv).unbind('linkRequest').bind('linkRequest', linkRequestHandler);


/**
* put your comment there...
*
* @param object e System event object
* @param senderID
* @param linkSource
* @param linkTarget
* @param oldLinkTarget
*/

    function linkCompleteHandler(e,senderID, linkSource, linkTarget, oldLinkTarget) {
      if (senderID == imgVE.id) {
        return;
      }
      DEBUG.log("event","link complete recieved by imageVE in "+imgVE.id+" from "+senderID+" with source "+ linkSource+" and target "+linkTarget);
      //todo add code to detect segment to segment and update accordingly
      //update polygon for linking
      var polygon = imgVE.polygons[imgVE.polygonLookup[linkTarget]-1];
      polygon.linkIDs = imgVE.dataMgr.entities['seg'][linkTarget.substring(3)]['sclIDs'];
      polygon.color = "green";
      DEBUG.log("gen","polygon update for "+linkTarget+" now linked to "+ linkSource);
      imgVE.linkMode = false;
      if (oldLinkTarget) {
        removeLink(linkSource, oldLinkTarget);
      }
      imgVE.drawImage();
      imgVE.drawImagePolygons();
      if (imgVE.autoLink) {
        $('.editContainer').trigger('autoLinkAdvance',[imgVE.id,linkSource,linkTarget]);
      }
    };

    $(imgVE.editDiv).unbind('linkComplete').bind('linkComplete', linkCompleteHandler);


/**
* put your comment there...
*
* @param linkSource
* @param linkTarget
*/

    function removeLink(linkSource, linkTarget) {
      var linkedPolyIndex,segSylIDs,sclID,sylIndex;
      //remove link from polygon
      if (imgVE.polygonLookup[linkTarget]) {
        linkedPolyIndex = imgVE.polygonLookup[linkTarget] - 1;
        segSylIDs = imgVE.polygons[linkedPolyIndex].linkIDs;
        sclID = linkSource.substring(3);
        sylIndex = segSylIDs ? segSylIDs.indexOf(sclID):-1;
        if (sylIndex > -1) {
          segSylIDs.splice(sylIndex,1);
          imgVE.polygons[linkedPolyIndex].linkIDs = segSylIDs;
        }
        if (!segSylIDs || segSylIDs.length == 0) {
          imgVE.polygons[linkedPolyIndex].color = "red";
        }
      }
    };


/**
* put your comment there...
*
* @param object e System event object
* @param senderID
* @param linkSource
* @param linkTarget
*/

    function linkRemovedHandler(e,senderID, linkSource, linkTarget) {
      if (senderID == imgVE.id) {
        return;
      }
      DEBUG.log("event","link removed recieved by imageVE in "+imgVE.id+" from "+senderID+" with source "+ linkSource+" and target "+linkTarget);
      removeLink(linkSource,linkTarget);
      imgVE.drawImage();
      imgVE.drawImagePolygons();
    };

    $(imgVE.editDiv).unbind('linkRemoved').bind('linkRemoved', linkRemovedHandler);

    /**
    * linkResponseHandler is a call back event that receives the target entity tag that was selected by the user in another
    * editor. This is where we have enough information to procede or not with the actual linking process.
    *
    *
    * @param object e System event object
    * @param senderID
    * @param linkTarget
    */

    function linkResponseHandler(e,senderID, linkTarget) {
      if (senderID == imgVE.id || !imgVE.linkSource) {
        return;
      }
      var savedata={},
          srcPrefix = imgVE.linkSource.substring(0,3),
          trgPrefix = linkTarget.substring(0,3),
          srcID = imgVE.linkSource.substring(3),
          trgID = linkTarget.substring(3),
          segID, sclID, sclOldSegID, srcSegMappedIDs, trgSegMappedIDs;

          DEBUG.log("event","link response received by imageVE in "+imgVE.id+" from "+senderID+" with source "+imgVE.linkSource+" target "+ linkTarget);

      if ( srcPrefix == "seg" && srcPrefix == trgPrefix) { // segment to segment linking
        if (imgVE.dataMgr.entities['seg'][srcID].readonly) {
          alert("segment to segment linking aborted, not possible with readonly segment segID "+srcID);
          imgVE.linkMode=false;
          imgVE.drawImage();
          imgVE.drawImagePolygons();
          $('.editContainer').trigger('linkAbort',[imgVE.id,"seg"+srcID,"seg"+trgID]);
          return;
        }
        if (imgVE.dataMgr.entities['seg'][trgID].readonly) {
          alert("segment to segment linking aborted, not possible with readonly segment segID "+srcID);
          imgVE.linkMode=false;
          imgVE.drawImage();
          imgVE.drawImagePolygons();
          $('.editContainer').trigger('linkAbort',[imgVE.id,"seg"+srcID,"seg"+trgID]);
          return;
        }
        srcSegMappedIDs = imgVE.dataMgr.entities['seg'][srcID]['mappedSegIDs']?imgVE.dataMgr.entities['seg'][srcID]['mappedSegIDs']:[],
        trgSegMappedIDs = imgVE.dataMgr.entities['seg'][trgID]['mappedSegIDs']?imgVE.dataMgr.entities['seg'][trgID]['mappedSegIDs']:[];
        srcSegMappedIDs.push(trgID);
        trgSegMappedIDs.push(srcID);
        savedata['seg'] = [{seg_id:srcID, seg_mapped_seg_ids: '{'+srcSegMappedIDs.join()+'}'},
                           {seg_id:trgID, seg_mapped_seg_ids: '{'+trgSegMappedIDs.join()+'}'}];
      } else {//received from edition editor after selecting syllable
        if (srcPrefix == "seg") {
          segID = srcID;
          sclID = trgID;
        } else {
          segID = trgID;
          sclID = srcID;
        }
        if (imgVE.dataMgr.entities['scl'][sclID].readonly) {
          alert("segment to syllable linking aborted, not possible with readonly syllable sclID "+sclID);
          imgVE.linkMode=false;
          imgVE.drawImage();
          imgVE.drawImagePolygons();
          $('.editContainer').trigger('linkAbort',[imgVE.id,"seg"+segID,"scl"+sclID]);
          return;
        }
        sclOldSegID = imgVE.dataMgr.entities['scl'][sclID]['segID'];
        oldIsTransSeg = (imgVE.dataMgr.entities['seg'][sclOldSegID]['stringpos'] && imgVE.dataMgr.entities['seg'][sclOldSegID]['stringpos'].length);
        savedata['scl'] = [{scl_id:sclID,scl_segment_id:segID}];
        if (oldIsTransSeg) {
          scratch = (imgVE.dataMgr.entities['scl'][sclID]['scratch']?JSON.parse(imgVE.dataMgr.entities['scl'][1]['scratch']):{});
          scratch['tranSeg'] = 'seg'+sclOldSegID;
          savedata['scl'][0]['scl_scratch'] = JSON.stringify(scratch);
        }
      }
      //save link
      $.ajax({
          dataType: 'json',
          url: basepath+'/services/saveEntityData.php?db='+dbName,
          data: 'data='+JSON.stringify(savedata),
          asynch: false,
          success: function (data, status, xhr) {
              if (typeof data == 'object' && data.syllablecluster && data.syllablecluster.success) {
                if (data['syllablecluster'].columns &&
                    data['syllablecluster'].records[0] &&
                    data['syllablecluster'].columns.indexOf('scl_id') > -1) {
                  var record, segID, sclID, cnt, sclLabel, oldSegPolyIndex, sylIndex, segLabel, segSylIDs,
                      unlinkedSegLabel = !oldIsTransSeg?'seg'+sclOldSegID:null,
                      pkeyIndex = data['syllablecluster'].columns.indexOf('scl_id'),
                      segIdIndex = data['syllablecluster'].columns.indexOf('scl_segment_id');
                  cnt = data['syllablecluster'].records.length;
                  // for each record
                  for(i=0; i<cnt; i++) {
                    record = data['syllablecluster'].records[i];
                    sclID = record[pkeyIndex];
                    segID = record[segIdIndex];
                    sclLabel = 'scl'+sclID;
                    segLabel = 'seg'+segID;
                    // update cached data
                    segSylIDs = imgVE.dataMgr.entities['seg'][segID]['sclIDs'] ? imgVE.dataMgr.entities['seg'][segID]['sclIDs']:[];
                    segSylIDs.push(sclID);
                    imgVE.dataMgr.entities['seg'][segID]['sclIDs'] = segSylIDs;
                    imgVE.dataMgr.entities['scl'][sclID]['segID'] = segID;
                    imgVE.polygons[imgVE.polygonLookup[segLabel]-1].linkIDs = segSylIDs;
                    imgVE.polygons[imgVE.polygonLookup[segLabel]-1].color = "";
                    if (unlinkedSegLabel) { // need to remove the syllable from the previous segment
                      if (imgVE.dataMgr.entities['seg'][sclOldSegID]['sclIDs']) {
                        segSylIDs = imgVE.dataMgr.entities['seg'][sclOldSegID]['sclIDs'];
                        sylIndex = segSylIDs.indexOf(sclID);
                        if (sylIndex > -1) {
                          segSylIDs.splice(sylIndex,1);
                          imgVE.dataMgr.entities['seg'][sclOldSegID]['sclIDs'] = segSylIDs;
                        }
                      }
                      if (imgVE.polygonLookup[unlinkedSegLabel]) {
                        oldSegPolyIndex = imgVE.polygonLookup[unlinkedSegLabel] - 1;
                        segSylIDs = imgVE.polygons[oldSegPolyIndex].linkIDs;
                        sylIndex = segSylIDs ? segSylIDs.indexOf(sclID):-1;
                        if (sylIndex > -1) {
                          segSylIDs.splice(sylIndex,1);
                          imgVE.polygons[oldSegPolyIndex].linkIDs = segSylIDs;
                        }
                        if (!segSylIDs || segSylIDs.length == 0) {
                          imgVE.polygons[oldSegPolyIndex].color = "red";
                        }
                      }
                    }
      DEBUG.log("gen"," linked "+segLabel+" to "+sclLabel);
                  }
                  imgVE.linkMode=false;
                  imgVE.drawImage();
                  imgVE.drawImagePolygons();
                  $('.editContainer').trigger('linkComplete',[imgVE.id,segLabel,sclLabel]);
                }else{
                // todo add code for segment to segment linking
                //also need to add code for differentiating syllable links from mapped segment links
                }
                if (data['segment'] && data['segment'].errors && data['segment'].errors.length) {
                  alert("An error occurred while trying to save to a segment record. Error: " + data['segment'].errors.join());
                }
                if (data['syllablecluster'] && data['syllablecluster'].errors && data['syllablecluster'].errors.length) {
                  alert("An error occurred while trying to save to a segment record. Error: " + data['syllablecluster'].errors.join());
                }
                if (data['error']) {
                  alert("An error occurred while trying to save to a segment record. Error: " + data['error']);
                }
              }
          },// end success cb
          error: function (xhr,status,error) {
              // add record failed.
              alert("An error occurred while trying to link. Error: " + error);
          }
      });// end ajax

    };

    $(imgVE.editDiv).unbind('linkResponse').bind('linkResponse', linkResponseHandler);


/**
* put your comment there...
*
* @param object e System event object
* @param senderID
* @param selectionIDs
*/

    function updateSelectionHandler(e,senderID, selectionIDs) {
      if (senderID == imgVE.id) {
        return;
      }
      DEBUG.log("event","selection changed received by imageVE in "+imgVE.id+" from "+senderID+" selected ids "+ selectionIDs.join());
      imgVE.unselectAllPolygons();
      $.each(selectionIDs, function(i,val) {
         imgVE.selectPolygonByName(val);
      });
      imgVE.linkMode = false;
      imgVE.drawImage();
      imgVE.drawImagePolygons();
    };

    $(imgVE.editDiv).unbind('updateselection').bind('updateselection', updateSelectionHandler);


/**
* put your comment there...
*
* @param object e System event object
* @param senderID
* @param selectionIDs
*/

    function enterSyllableHandler(e,senderID, selectionIDs) {
      if (senderID == imgVE.id) {
        return;
      }
//      DEBUG.log("gen""enterSyllable received by "+pimgVE.idane+" for "+ selectionIDs[0]);
      var i, id;
      $.each(selectionIDs, function(i,val) {
        imgVE.setImagePolygonHilite(imgVE.getIndexbyPolygonName(val),true);
      });
      imgVE.drawImagePolygons();
    };

    $(imgVE.editDiv).unbind('enterSyllable').bind('enterSyllable', enterSyllableHandler);


/**
* put your comment there...
*
* @param object e System event object
* @param senderID
* @param selectionIDs
*/

    function leaveSyllableHandler(e,senderID, selectionIDs) {
      if (senderID == imgVE.id) {
        return;
      }
      var i, id;
      $.each(selectionIDs, function(i,val) {
        imgVE.setImagePolygonHilite(imgVE.getIndexbyPolygonName(val),false);
      });
      imgVE.drawImage();
      imgVE.drawImagePolygons();
    };

    $(imgVE.editDiv).unbind('leaveSyllable').bind('leaveSyllable', leaveSyllableHandler);


/**
* put your comment there...
*
* @param object e System event object
* @param senderID
* @param anchorSegID
* @param visFraction
*/

    function synchronizeHandler(e,senderID, anchorSegID, visFraction) {
      if (senderID == imgVE.id) {
        return;
      }
      var top, polygon, index;
      //find segment's polygon
      index = imgVE.polygonLookup[anchorSegID];
      if (index) {
        polygon = imgVE.polygons[-1+index];
      }
      if (polygon && polygon.label == anchorSegID) {
        polygon = polygon.polygon;
        top = polygon[0][1] + visFraction * (polygon[2][1] - polygon[0][1]);
      }
      //calculate position for segment polygon
      imgVE.eraseNavPanel();
      imgVE.moveViewportToImagePosY(top);
      imgVE.draw();
    };

    $(imgVE.editDiv).unbind('synchronize').bind('synchronize', synchronizeHandler);

  },


/**
* put your comment there...
*
* @returns {Array}
*/

  getPath: function () {
    if (!this.path || !this.path.length) return null;
    var intPoly = [],
        i,x,y,
        cnt = this.path.length;
        for (i=0; i< cnt; i++) {
          intPoly.push([ Math.round(this.path[i][0]),Math.round(this.path[i][1])]);
        }
    return intPoly;
  },


/**
* put your comment there...
*
*/

  clearPath: function () {
    this.path = null;
  },


/**
* put your comment there...
*
*/

  redrawPath: function () {
    var imgVE = this;
    if (!this.path || !this.path.length) return;
    this.imgContext.clearRect(0,0,this.imgCanvas.width,this.imgCanvas.height);
    this.drawImage();
    this.drawImagePolygons();
    this.imgContext.strokeStyle = (imgVE.segMode == "done" ? "green":"red");
    this.imgContext.lineWidth = 2;
    if (this.path.length == 1){
      var x = (this.path[0][0] - imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width)/imgVE.vpSize.width*imgVE.navCanvas.width/imgVE.image.width*imgVE.imgCanvas.width,
          y = (this.path[0][1] - imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height)/imgVE.vpSize.height*imgVE.navCanvas.height/imgVE.image.height*imgVE.imgCanvas.height;
      this.imgContext.beginPath();
      this.imgContext.moveTo(x-this.crossSize,y);
      this.imgContext.lineTo(x+this.crossSize,y);
      this.imgContext.moveTo(x,y-this.crossSize);
      this.imgContext.lineTo(x,y+this.crossSize);
      this.imgContext.stroke();
    }else{
      var i,
      xStart = (this.path[0][0] - imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width)/imgVE.vpSize.width*imgVE.navCanvas.width/imgVE.image.width*imgVE.imgCanvas.width,
      yStart = (this.path[0][1] - imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height)/imgVE.vpSize.height*imgVE.navCanvas.height/imgVE.image.height*imgVE.imgCanvas.height;
      this.imgContext.beginPath();
      if (this.segMode == "path"){
        this.imgContext.rect( xStart-2, yStart-2, 4, 4);
      }
      this.imgContext.moveTo(xStart,yStart);
      for (i=1; i < this.path.length; i++) {
        this.imgContext.lineTo((this.path[i][0] - imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width)/imgVE.vpSize.width*imgVE.navCanvas.width/imgVE.image.width*imgVE.imgCanvas.width,
                               (this.path[i][1] - imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height)/imgVE.vpSize.height*imgVE.navCanvas.height/imgVE.image.height*imgVE.imgCanvas.height);
      }
      this.imgContext.closePath();
      this.imgContext.stroke();
    }
  },


/**
* put your comment there...
*
* @param alpha
*/

  drawNavPanel: function(alpha) {+
    this.navContext.save();
    this.navContext.globalAlpha = alpha;
    this.navContext.drawImage(this.image,//draw scaled image into pan window
      0, 0,
      this.image.width,
      this.image.height,
      0, 0,
      this.navCanvas.width,
      this.navCanvas.height);
    this.navContext.restore();
  },


/**
* put your comment there...
*
*/

  drawImage: function() {
    var width = this.image.width * this.vpSize.width / this.navCanvas.width,
        height = this.image.height * this.vpSize.height / this.navCanvas.height;//BUG index calcs < 0
    this.imgContext.drawImage(this.image,
      this.vpLoc.x * this.image.width / this.navCanvas.width,
      this.vpLoc.y * this.image.height / this.navCanvas.height,
      width,
      height,
      0, 0,
      this.imgCanvas.width,
      this.imgCanvas.height);
  },


/**
* put your comment there...
*
* @param polygon
*/

  hiliteImagePolygon: function (polygon) {//todo finish highlite - should save image section, draw path and restore in unhighlite
    var imgVE = this;
    if (!polygon) return;
    this.imgContext.save();
    var i,j,
        offsetX = imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width,
        scaleX = imgVE.navCanvas.width/imgVE.vpSize.width*imgVE.imgCanvas.width/imgVE.image.width,
        offsetY = imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height,
        scaleY = imgVE.navCanvas.height/imgVE.vpSize.height*imgVE.imgCanvas.height/imgVE.image.height;
    if (!this.viewAllPolygons) {
      if (polygon.hidden && !this.selectedPolygons[polygon.label]) {
        ;
      }
    }
    this.imgContext.strokeStyle = this.selectedPolygons[polygon.label]? "white" : polygon.color;
    this.imgContext.lineWidth = this.selectedPolygons[polygon.label]? 3 :polygon.width; //polygon width
    this.imgContext.beginPath();
    this.imgContext.moveTo((polygon.polygon[0][0] - offsetX)*scaleX,(polygon.polygon[0][1] - offsetY)*scaleY);
    for (j=1; j < polygon.polygon.length; j++) {
      this.imgContext.lineTo((polygon.polygon[j][0] - offsetX)*scaleX,(polygon.polygon[j][1] - offsetY)*scaleY);
    }
    this.imgContext.closePath();
    this.imgContext.stroke();

    this.imgContext.restore();
  },


/**
* put your comment there...
*
*/

  drawImagePolygons: function () {
    var imgVE = this;
    if (!this.polygons || !this.polygons.length) return;
    this.imgContext.save();
    var i,j,polygon,
        offsetX = imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width,
        scaleX = imgVE.navCanvas.width/imgVE.vpSize.width*imgVE.imgCanvas.width/imgVE.image.width,
        offsetY = imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height,
        scaleY = imgVE.navCanvas.height/imgVE.vpSize.height*imgVE.imgCanvas.height/imgVE.image.height;
    for(i=0;i<this.polygons.length; i++) {
      polygon = this.polygons[i];
      if (!this.viewAllPolygons && !this.linkMode) {
        if (polygon.hidden && !polygon.hilite && !this.selectedPolygons[polygon.label]) {
          continue;
        }
      }
      this.imgContext.strokeStyle = polygon.hilite? "white" : (this.selectedPolygons[polygon.label]? "white" : polygon.color);
      this.imgContext.lineWidth = (this.selectedPolygons[polygon.label]? 3 : polygon.width); //polygon width
      this.imgContext.beginPath();
      this.imgContext.moveTo((polygon.polygon[0][0] - offsetX)*scaleX,(polygon.polygon[0][1] - offsetY)*scaleY);
      for (j=1; j < polygon.polygon.length; j++) {
        this.imgContext.lineTo((polygon.polygon[j][0] - offsetX)*scaleX,(polygon.polygon[j][1] - offsetY)*scaleY);
      }
      this.imgContext.closePath();
      this.imgContext.stroke();
    }
    this.imgContext.restore();
  },


/**
* put your comment there...
*
* @param polygon
* @param color
* @param width
*/

  drawColoredPolygon: function (polygon,color,width) {
    var imgVE = this;
    this.imgContext.save();
    this.imgContext.strokeStyle = (color?color:"green");
    this.imgContext.lineWidth = (width?width:1);
    var j,
        offsetX = imgVE.vpLoc.x * imgVE.image.width / imgVE.navCanvas.width,
        scaleX = imgVE.navCanvas.width/imgVE.vpSize.width*imgVE.imgCanvas.width/imgVE.image.width,
        offsetY = imgVE.vpLoc.y * imgVE.image.height / imgVE.navCanvas.height,
        scaleY = imgVE.navCanvas.height/imgVE.vpSize.height*imgVE.imgCanvas.height/imgVE.image.height;
    this.imgContext.beginPath();
    this.imgContext.moveTo((polygon[0][0] - offsetX)*scaleX,(polygon[0][1] - offsetY)*scaleY);
    for (j=1; j < polygon.length; j++) {
      this.imgContext.lineTo((polygon[j][0] - offsetX)*scaleX,(polygon[j][1] - offsetY)*scaleY);
    }
    this.imgContext.closePath();
    this.imgContext.stroke();
    this.imgContext.restore();
  },


/**
* put your comment there...
*
*/

  drawViewport: function () {
    this.navContext.shadowColor = 'rgba(0,0,0,0.4)';
    this.navContext.shadowOffsetX = 2;
    this.navContext.shadowOffsetY = 2;
    this.navContext.shadowBlur = 3;

    this.navContext.lineWidth = 3;
    this.navContext.strokeStyle = 'white';
    this.navContext.strokeRect( this.vpLoc.x,
                                this.vpLoc.y,
                                this.vpSize.width,
                                this.vpSize.height);
  },


/**
* put your comment there...
*
*/

  clipToViewport: function() {
    this.navContext.beginPath();
    this.navContext.rect( this.vpLoc.x,
                          this.vpLoc.y,
                          this.vpSize.width,
                          this.vpSize.height);
    this.navContext.clip();
  },


/**
* put your comment there...
*
*/

  draw: function() {
    this.drawImage();
    this.drawNavPanel(this.navOpacity);
    this.navContext.save();
    this.clipToViewport();
    this.drawNavPanel(1.0);
    this.navContext.restore();

    this.drawViewport();
    this.drawImagePolygons();
    this.redrawPath();
  },


/**
* put your comment there...
*
* @returns {String}
*/

  getCommandStack: function() {
    if (!this.imgCmdStack){
      return "";
    }
    return this.imgCmdStack.join(",");
  },


/**
* put your comment there...
*
*/

  clearImageCommands: function() {
    this.imgCmdStack = [];
    this.fadeColors = {};
  },


/**
* put your comment there...
*
* @param str
*/

  runCommandString: function(str) {
    if (!str){
      return ;
    }
    this.imgCmdStack = [];
    commands = str.replace(",","");
    commands = commands.toUpperCase();
    var i;
    for (i=0; i<commands.length; i++){
      switch (commands[i]) {
        case 'S':
          this.stretch();
          break;
        case 'R':
          this.reduce();
          break;
        case 'I':
          this.invert();
          break;
        case 'E':
          this.emboss();
          break;
      }
    }
  },
/************************************************  Image Processors**************************************************/

/**
* put your comment there...
*
*/

  stretch: function() {
    var imgdata, data, length, width, max, min, mean, minAdjust, maxAdjust;

    imgdata = this.imgContext.getImageData(0, 0,this.imgCanvas.width, this.imgCanvas.height);
    data = imgdata.data;
    width = imgdata.width;
    length = data.length;
    min = max = 255/2;

    for (i=0; i < length; i++) { // loop through pixels
      // if it's not an alpha
      if ((i+1) % 4 !== 0) {
        if (min && data[i]-min < 0) {
          min = data[i];
        } else if ( max - data[i] < 0) {
          max = data[i];
        }
      }
    }
    mean = max/2 + min/2;
    maxAdjust = (max == 255 ? 2 : Math.floor(127-max/2));
    minAdjust = (min == 0 ? 1 : Math.ceil(min/2));
    for (i=0; i < length; i++) { // loop through pixels
      if ((i+1) % 4 !== 0) {
        if (data[i] > mean) {
          data[i] += maxAdjust;
          if (data[i] > 255) {
            data[i] = 255;
          }
        }else{
          data[i] -= minAdjust;
          if (data[i] < 0) {
            data[i] = 0;
          }
        }
      }
    }
    this.imgContext.putImageData(imgdata, 0, 0);
    if (!this.imgCmdStack) {
      this.imgCmdStack = ["S"];
    }else{
      this.imgCmdStack.push("S");
    }
  },


/**
* put your comment there...
*
*/

  reduce: function() {
    var imgdata, data, length, width;

    imgdata = this.imgContext.getImageData(0, 0,this.imgCanvas.width, this.imgCanvas.height);
    data = imgdata.data;
    width = imgdata.width;
    length = data.length;

    for (i=0; i < length; i++) { // loop through pixels
        // if it's not an alpha
        if ((i+1) % 4 !== 0) {
          data[i] = Math.floor(data[i]*0.9); //inverse color
        }
    }
    this.imgContext.putImageData(imgdata, 0, 0);
    if (!this.imgCmdStack) {
      this.imgCmdStack = ["R"];
    }else{
      this.imgCmdStack.push("R");
    }
  },


/**
* put your comment there...
*
* @returns true|false
*/

  fade: function() {
    var imgdata, data, sampledata, cnt, length, hash, path, fadeColor,
        offsetX = this.vpLoc.x * this.image.width / this.navCanvas.width,
        scaleX = this.navCanvas.width/this.vpSize.width*this.imgCanvas.width/this.image.width,
        offsetY = this.vpLoc.y * this.image.height / this.navCanvas.height,
        scaleY = this.navCanvas.height/this.vpSize.height*this.imgCanvas.height/this.image.height;

    path = this.getPath();
    if(!path && !Object.keys(this.fadeColors).length){
      alert("Please drag select an area of the image to fade");
      return false;
    }
    if (path && path.length) {//add color samples to fade
      //find this.path bounding box  todo add support for polygon sample
      path = UTILITY.getBoundingRect(path);
      // get colors for fade  [[x1,y1],[x2,y1],[x2,y2],[x1,y2]);
      sampledata = this.imgContext.getImageData((path[0][0] - offsetX)*scaleX,
                                                (path[0][1] - offsetY)*scaleY,
                                                (path[2][0] - path[0][0])*scaleX,
                                                (path[2][1] - path[0][1])*scaleY);
      //create has R-G-B for lookup of fade values [R',G',B']
      sampledata = sampledata.data;
      length = sampledata.length;
      var R,G,B;
      for (i=0; i < length-4; i+=4) { // loop through each pixel
        R = Math.floor(sampledata[i]/10);
        G = Math.floor(sampledata[i+1]/10);
        B = Math.floor(sampledata[i+2]/10);
        hash = R+"-"+G+"-"+B;
        if (!this.fadeColors[hash]) {
          this.fadeColors[hash] = [ Math.round((255-R*10)*0.8),G + Math.round((255-G*10)*0.8),B + Math.round((255-B*10)*0.8)];
        }
      }
    }

    //fade image
    if ( Object.keys(this.fadeColors).length){
      imgdata = this.imgContext.getImageData(0, 0,this.imgCanvas.width, this.imgCanvas.height);
      data = imgdata.data;
      length = data.length;

      for (i=0; i < length-4; i+=4) { // loop through each pixel
          // if it's color matched fade by replacing with lookup value
        R = Math.floor(data[i]/10);
        G = Math.floor(data[i+1]/10);
        B = Math.floor(data[i+2]/10);
        hash = R+"-"+G+"-"+B;
        if (this.fadeColors[hash]) { //hit
          fadeColor = this.fadeColors[hash];
          data[i] = Math.min(255,data[i]+fadeColor[0]); //red
          data[i+1] = Math.min(255,data[i+1]+fadeColor[1]); //green
          data[i+2] = Math.min(255,data[i+2]+fadeColor[2]); //blue
        }
      }
      this.imgContext.putImageData(imgdata, 0, 0);
    }
  },


/**
* put your comment there...
*
*/

  invert: function() {
    var imgdata, data, length, width;

    imgdata = this.imgContext.getImageData(0, 0,this.imgCanvas.width, this.imgCanvas.height);
    data = imgdata.data;
    width = imgdata.width;
    length = data.length;

    for (i=0; i < length; i++) { // loop through pixels
        // if it's not an alpha
        if ((i+1) % 4 !== 0) {
          data[i] = 255 - data[i]; //inverse color
        }
    }
    this.imgContext.putImageData(imgdata, 0, 0);
    if (!this.imgCmdStack) {
      this.imgCmdStack = ["I"];
    }else{
      this.imgCmdStack.push("I");
    }
  },


/**
* put your comment there...
*
*/

  emboss: function() {
    var imgdata, data, length, width;

    imgdata = this.imgContext.getImageData(0, 0,this.imgCanvas.width, this.imgCanvas.height);
    data = imgdata.data;
    width = imgdata.width;
    length = data.length;

    for (i=0; i < length; i++) { // loop through pixels
      // if we won't overrun the bounds of the array
      if (i <= length-width*4) {

        // if it's not an alpha
        if ((i+1) % 4 !== 0) {

          // if it's the last pixel in the row, there is
          // no pixel to the right, so copy previous pixel's
          // values.
          if ((i+4) % (width*4) == 0) {
            data[i] = data[i-4];
            data[i+1] = data[i-3];
            data[i+2] = data[i-2];
            data[i+3] = data[i-1];
            i+=4;
          } else { // not the last pixel in the row
            data[i] = 255/2  // Average value
                      + 2*data[i]   // current pixel
                      - data[i+4]   // next pixel
                      - data[i+width*4]; // pixel underneath
          }
        }
      } else if ((i+1) % 4 !== 0) { // last row, no pixels underneath, so copy pixel above
        data[i] = data[i-width*4];
      }
    }
    this.imgContext.putImageData(imgdata, 0, 0);
    if (!this.imgCmdStack) {
      this.imgCmdStack = ["E"];
    }else{
      this.imgCmdStack.push("E");
    }
  }
};
