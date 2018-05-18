<?php
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
* @author      Stephen White  <stephenawhite57@gmail.com>
* @copyright   @see AUTHORS in repository root <https://github.com/readsoftware/read>
* @link        https://github.com/readsoftware
* @version     1.0
* @license     @see COPYING in repository root or <http://www.gnu.org/licenses/>
* @package     READ Research Environment for Ancient Documents
*/

/**
* viewer
*
* creates a framework for the text viewer interface according to the setting in config.php
* it support opening with a parameter set that defines the layout.
*/

  require_once (dirname(__FILE__) . '/../common/php/sessionStartUp.php');//initialize the session
  require_once (dirname(__FILE__) . '/../common/php/DBManager.php');//get database interface
  require_once (dirname(__FILE__) . '/../common/php/userAccess.php');//get user access control
  require_once (dirname(__FILE__) . '/../common/php/utils.php');//get utilies
  require_once (dirname(__FILE__) . '/../model/entities/EntityFactory.php');//get user access control
  require_once (dirname(__FILE__) . '/php/viewutils.php');//get utilities for viewing
  $dbMgr = new DBManager();
  //check and validate parameters
  $data = (array_key_exists('data',$_REQUEST)? json_decode($_REQUEST['data'],true):$_REQUEST);
  if (!$data) {
    returnXMLErrorMsgPage("invalid viewer request - not enough or invalid parameters");
  } else {
    //get parameters
    $refreshLookUps = (!isset($data['refreshLookUps']) || !$data['refreshLookUps'])? false:true;//default (parameter missing) not multi edition
    $multiEdition = (!isset($data['multiEd']) || !$data['multiEd'])? false:true;//default (parameter missing) not multi edition
    $isStaticView = (!isset($data['staticView'])||$data['staticView']==0)?false:true;
    $txtID = null;
    $cfgEntityTag = null;
    if(!$isStaticView) {
      $title = (isset($data['title'])?$data['title']:null);
    }
    $ednIDs = $ednID = null;
    $catIDs = $catID = $ednToCatID = null;
    if (isset($data['txtID']) && is_numeric($data['txtID'])) {
      $txtID = intval($data['txtID']);
      if (!is_int($txtID)) {
        $txtID = null;
      }
    }
    if ( isset($data['ednID'])) {
      $ednID = $data['ednID'];
      $ednIDs = explode(",",$ednID);
      $ednID = intval($ednIDs[0]); //first id is primary
      if (!is_int($ednID)) {
        $ednIDs = $ednID = null;
      }
    }
    if ( isset($data['catID'])) {//optional override
      $catID = $data['catID'];
      $catIDs = explode(",",$catID);
      $catID = intval($catIDs[0]); //first id is primary
      if (!is_int($catID)) {
        $catIDs = $catID = null;
      } else if (!$txtID && $ednIDs){
        $cntCat = count($catIDs);
        $ednToCatID = array();
        for ($i = 0; $i < count($ednIDs); $i++){
          if ($cntCat == 1){
            $ednToCatID[$ednIDs[$i]] = $catIDs[0];//single catalog case
          } else if ($i < $cntCat) {
            $ednToCatID[$ednIDs[$i]] = $catIDs[$i];//multiple catalog case
          } else {
            $ednToCatID[$ednIDs[$i]] = null;//too many ednIDs case
          }
        }
      }
    }
    $entityCfgStaticView = null;
    if (!$txtID && !$ednID) {
      returnXMLErrorMsgPage("invalid viewer request - not enough or invalid parameters");
    } else if ($txtID) {
      $text = new Text($txtID);
      if ($text->hasError()) {
        returnXMLErrorMsgPage("unable to load text $txtID - ".join(",",$text->getErrors()));
      }
      $editions = $text->getEditions();
      if ($editions->getError() || $editions->getCount() == 0) {
        returnXMLErrorMsgPage("unable to load any text editions - ".$editions->getError());
      }
      $cfgEntityTag = DBNAME."txt$txtID";
      $entityCfgStaticView = $text->getScratchProperty("cfgStaticView");
      if ($entityCfgStaticView) {
        $entityCfgStaticView = json_decode($entityCfgStaticView);
      }
      $edition = $editions->current();
      //get this text's default edition
      $ednIDs = $editions->getKeys();
      $sortedEdnIDs = $ednIDs;
      sort($sortedEdnIDs,SORT_NUMERIC);
      $ednID = $sortedEdnIDs[0];
      if ($catID) {
        $ednToCatID = array($ednID=>$catID);//single catalog case
      }
      if (!$multiEdition){
        $ednIDs = null;
      }
      if (!$title){//if not being
        $title = ($text->getCKN()?$text->getCKN()." ∙ ":"").$text->getTitle();
      }
    } else {
      $edition = new Edition($ednID);
      if ($edition->hasError() || !$edition->getID()) {
        returnXMLErrorMsgPage("unable to load edition - ".join(",",$edition->getErrors()));
      }
      $cfgEntityTag = DBNAME."edn$ednID";
      $entityCfgStaticView = $edition->getScratchProperty("cfgStaticView");
      if ($entityCfgStaticView) {
        $entityCfgStaticView = json_decode($entityCfgStaticView);
      }
      $text = $edition->getText(true);
      if (!$text || $text->hasError()) {
        returnXMLErrorMsgPage("invalid viewer request - access denied");
      }
      if (!$title){//if not being
        $title = ($text->getCKN()?$text->getCKN()." ∙ ":"").$text->getTitle();
      }
      $txtID = $text->getID();
    }
    $multiEditionHeaderDivHtml = null;
    if ($multiEdition && $ednIDs && count($ednIDs) > 1) {//setup edition info strcture
      $multiEditionHeaderDivHtml = getMultiEditionHeaderHtml($ednIDs);
    }
  }

  if (!$isStaticView){
    $overwrite = (isset($data['overwrite']) && $data['overwrite'] != 0)?true:false;
    $exportGlossary = isset($data['expGlossary'])?(!$data['expGlossary']?false:true):
                          (defined("EXPORTFULLGLOSSARY")?EXPORTFULLGLOSSARY:false);
    $allowImageDownload = isset($data['imgDownload'])?(!$data['imgDownload']?false:true):
                          (defined("ALLOWIMAGEDOWNLOAD")?ALLOWIMAGEDOWNLOAD:false);
    $allowTeiDownload = isset($data['teiDownload'])?(!$data['teiDownload']?false:true):
                          (defined("ALLOWTEIDOWNLOAD")?ALLOWTEIDOWNLOAD:true);
    $showExportButton = isset($data['showExport'])?(!$data['showExport']?false:true):
                          (defined("SHOWEXPORTBUTTON")?SHOWEXPORTBUTTON:true);
    $showContentOutline = isset($data['showTOC'])?(!$data['showTOC']?false:true):
                          (defined("SHOWVIEWERCONTENTOUTLINE")?SHOWVIEWERCONTENTOUTLINE:true);
    $showImageView = isset($data['showImage'])?(!$data['showImage']?false:true):
                          (defined("SHOWIMAGEVIEW")?SHOWIMAGEVIEW:true);
    $showTranslationView = isset($data['showTrans'])?(!$data['showTrans']?false:true):
                                (defined("SHOWTRANSLATIONVIEW")?SHOWTRANSLATIONVIEW:true);
    $showChayaView = isset($data['showChaya'])?(!$data['showChaya']?false:true):
                          (defined("SHOWCHAYAVIEW")?SHOWCHAYAVIEW:true);
  } else {// static view calculation - need to check for variables from being included
    $overwrite = false;
    $exportGlossary = isset($exportGlossary)?$exportGlossary:
                          (defined("EXPORTFULLGLOSSARY")?EXPORTFULLGLOSSARY:false);
    $allowImageDownload = isset($allowImageDownload)?$allowImageDownload:
                          (defined("ALLOWIMAGEDOWNLOAD")?ALLOWIMAGEDOWNLOAD:false);
    $allowTeiDownload = isset($allowTeiDownload)?$allowTeiDownload:
                          (defined("ALLOWTEIDOWNLOAD")?ALLOWTEIDOWNLOAD:true);
    $showContentOutline = isset($showContentOutline)?$showContentOutline:
                          (defined("SHOWVIEWERCONTENTOUTLINE")?SHOWVIEWERCONTENTOUTLINE:true);
    $showImageView = isset($showImageView)?$showImageView:
                          (defined("SHOWIMAGEVIEW")?SHOWIMAGEVIEW:true);
    $showTranslationView = isset($showTranslationView)?$showTranslationView:
                                (defined("SHOWTRANSLATIONVIEW")?SHOWTRANSLATIONVIEW:true);
    $showChayaView = isset($showChayaView)?$showChayaView:
                          (defined("SHOWCHAYAVIEW")?SHOWCHAYAVIEW:true);
  }

  //get list of all edition annotation types and use to test if there are any translations and/or chaya
  //note this is the same for multi-editions so the interface is built and hidden or shown based on each edition's data
  if ($ednIDs && count($ednIDs)) {
    $edAnnoTypes = getEditionAnnotationTypes($ednIDs);
  } else if ($ednID) {
    $edAnnoTypes = getEditionAnnotationTypes(array($ednID));
  }
  $hasTranslation = in_array(Entity::getIDofTermParentLabel('translation-annotationtype'),$edAnnoTypes);
  $hasChaya = in_array(Entity::getIDofTermParentLabel('chaya-translation'),$edAnnoTypes);
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Cache-Control" content="no-cache">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta http-equiv="Lang" content="en">
    <title><?=$title?></title>
    <link rel="stylesheet" href="/jqwidget/jqwidgets/styles/jqx.base.css" type="text/css" />
    <link rel="stylesheet" href="/jqwidget/jqwidgets/styles/jqx.energyblue.css" type="text/css" />
    <link rel="stylesheet" href="./css/readviewer.css" type="text/css" />
    <script src="/jquery/jquery-1.11.1.min.js"></script>
    <script src="/jqwidget/jqwidgets/jqxcore.js"></script>
    <script src="/jqwidget/jqwidgets/jqxtouch.js"></script>
    <script src="/jqwidget/jqwidgets/jqxdata.js"></script>
    <script src="/jqwidget/jqwidgets/jqxexpander.js"></script>
    <script src="/jqwidget/jqwidgets/jqxtooltip.js"></script>
    <script src="/jqwidget/jqwidgets/jqxcheckbox.js"></script>
    <script src="/jqwidget/jqwidgets/jqxbuttons.js"></script>
    <script src="/jqwidget/jqwidgets/jqxwindow.js"></script>
<?php
  $exportStaticURL = null;
  if ($isStaticView){
?>
    <script src="./js/utility.js"></script>
    <script src="./js/debug.js"></script>
<?php
  }else{
    $exportStaticBaseURL = SITE_BASE_PATH."\/viewer\/exportTextViewer.php?db=".DBNAME.
                            (isset($data['txtID'])?"&txtID=".$data['txtID']:($data['ednID']?"&ednID=".$data['ednID']:"")).
                            (isset($data['multiEd'])?"&multiEd=".$data['multiEd']:"").
                            (isset($data['catID'])?"&catID=".$data['catID']:"").
                            (isset($ednIDs)?"&xednIDs=".join(',',$ednIDs):"&xednIDs=$ednID");
?>
    <script src="../editors/js/utility.js"></script>
    <script src="../editors/js/debug.js"></script>
<?php
  }
?>
    <script src="./js/imageViewer.js"></script>
    <script type="text/javascript">
      var dbName = '<?=DBNAME?>',imgViewer,
          srvbasepath="<?=SITE_ROOT?>",
          basepath="<?=SITE_BASE_PATH?>",
<?php
  if (!$isStaticView) {
?>
          exportStaticBaseURL = "<?=$exportStaticBaseURL?>",
<?php
    $urlMap = array("tei"=>array());
    $teiBaseURL = SITE_BASE_PATH."/services/exportEditionToEpiDoc.php?db=".DBNAME."&download=1&ednID=";
    $glossaryUrlLookup = null;
  } else {
    $glossaryUrlLookup = (isset($urlMap) && isset($urlMap['gloss']))?$urlMap['gloss']:null;
  }
  if ($multiEdition) {
    $edStructHtmlByEdn = "";
    $edFootnotesByEdn = "";
    $edGlossaryLookupByEdn = "";
    $edTocHtmlByEdn = "";
    $edUrlBlnImgLookupByEdn = "";
    $edBlnPosLookupByEdn = "";
    $edPolysByBlnTagTokCmpTagByEdn = "";
    $isFirst = true;
    foreach ($ednIDs as $ednID) {
      if (!$isFirst) {
        $edStructHtmlByEdn .= ", '$ednID':";
        $edFootnotesByEdn .= ", '$ednID':";
        $edGlossaryLookupByEdn .= ", '$ednID':";
        $edTocHtmlByEdn .= ", '$ednID':";
        $edUrlBlnImgLookupByEdn .= ", '$ednID':";
        $edBlnPosLookupByEdn .= ", '$ednID':";
        $edPolysByBlnTagTokCmpTagByEdn .= ", '$ednID':";
      } else {
        $isFirst = false;
        $defaultEdnID = $ednID;
        $edStructHtmlByEdn .= "'$ednID':";
        $edFootnotesByEdn .= "'$ednID':";
        $edGlossaryLookupByEdn .= "'$ednID':";
        $edTocHtmlByEdn .= "'$ednID':";
        $edUrlBlnImgLookupByEdn .= "'$ednID':";
        $edBlnPosLookupByEdn .= "'$ednID':";
        $edPolysByBlnTagTokCmpTagByEdn .= "'$ednID':";
      }

      $edStructHtmlByEdn .= getEditionsStructuralViewHtml(array($ednID),$refreshLookUps);
      $edFootnotesByEdn .= getEditionFootnoteTextLookup();
      if ($ednToCatID && array_key_exists($ednID, $ednToCatID)) {//if there is a catID mapping then use for the primary edition only
        $edGlossaryLookupByEdn .= getEditionGlossaryLookup("cat".$ednToCatID[$ednID],$ednID,$refreshLookUps,$glossaryUrlLookup);
      } else {
        $edGlossaryLookupByEdn .= '{}';
      }
      $edTocHtmlByEdn .= "'".getEditionTOCHtml()."'";
      $edUrlBlnImgLookupByEdn .= getImageBaselineURLLookup();//reset and calc'd in getEditionsStructuralViewHtml
      $edBlnPosLookupByEdn .= getBaselinePosByEntityTagLookup();//reset and calc'd in getEditionsStructuralViewHtml
      $edPolysByBlnTagTokCmpTagByEdn .= getPolygonByBaselineEntityTagLookup();//reset and calc'd in getEditionsStructuralViewHtml
      if (!$isStaticView) {
        $urlMap["tei"]["edn$ednID"] = $teiBaseURL.$ednID;
      }
    }
?>
          multiEdition = true,
          edStructHtmlByEdn = {<?=$edStructHtmlByEdn?>},
          edFootnotesByEdn = {<?=$edFootnotesByEdn?>},//reset and calc'd in getEditionsStructuralViewHtml
          edGlossaryLookupByEdn = {<?=$edGlossaryLookupByEdn?>},//calc'd for first edition assuming all editions are inclusive
          edFootnotes = edFootnotesByEdn[<?=$defaultEdnID?>],//get first edition
          edStructHtml = edStructHtmlByEdn[<?=$defaultEdnID?>],//get first edition
          edGlossaryLookup = edGlossaryLookupByEdn[<?=$defaultEdnID?>]//get first edition
<?php
  } else if ($ednIDs && count($ednIDs) > 1){
?>
          multiEdition = false,
          edStructHtml = <?=getEditionsStructuralViewHtml($ednIDs,$refreshLookUps)?>,
          edFootnotes = <?=getEditionFootnoteTextLookup()?>,//reset and calc'd in getEditionsStructuralViewHtml
<?php
      if ($ednToCatID && array_key_exists($ednID, $ednToCatID)) {//if there is a catID mapping then use for the primary edition only
        $edGlossaryLookup = getEditionGlossaryLookup("cat".$ednToCatID[$ednID],$ednID,$refreshLookUps,$glossaryUrlLookup);
      } else {
        $edGlossaryLookup = '{}';
      }
?>
          edGlossaryLookup = <?=$edGlossaryLookup?>
<?php
    if (!$isStaticView) {
      $urlMap["tei"]["edn$ednID"] = $teiBaseURL.$ednID;
    }
  } else {
?>
          multiEdition = false,
<?php
/*
          $edStructHtml = json_encode(getEditionsStructuralViewHtml(array($ednID),$refreshLookUps));
          echo "edStructHtml = $edStructHtml,\n";
*/
?>
          edStructHtml = <?=getEditionsStructuralViewHtml(array($ednID),$refreshLookUps)?>,
          edFootnotes = <?=getEditionFootnoteTextLookup()?>,
<?php
      if ($ednToCatID && array_key_exists($ednID, $ednToCatID)) {//if there is a catID mapping then use for the primary edition only
        $edGlossaryLookup = getEditionGlossaryLookup("cat".$ednToCatID[$ednID],$ednID,$refreshLookUps,$glossaryUrlLookup);
      } else {
        $edGlossaryLookup = '{}';
      }
?>
          edGlossaryLookup = <?=$edGlossaryLookup?>
<?php
    if (!$isStaticView) {
      $urlMap["tei"]["edn$ednID"] = $teiBaseURL.$ednID;
    }
  }
?>
,
          ednToEpiDownloadURLs = <?=json_encode($urlMap['tei'])?>,
          editionIsPublic = <?=($edition->isResearchEdition()?"false":"true")?>,
          curEdnID = "<?=$edition->getID()?>",
          curEpidocDownloadURL = ednToEpiDownloadURLs["edn"+curEdnID]
<?php
  if ($showContentOutline) {
    if ($multiEdition) {
?>
,
          edTocHtmlByEdn = {<?=$edTocHtmlByEdn?>},//reset and calc'd in getEditionsStructuralViewHtml
          tocHtml = edTocHtmlByEdn[<?=$defaultEdnID?>]//get first edition
<?php
    } else {
?>
,
          tocHtml = '<?=getEditionTOCHtml()?>'//reset and calc'd in getEditionsStructuralViewHtml
<?php
    }
  }
  if ($showImageView && (count($imgURLsbyBlnImgTag['bln']) > 0 || count($imgURLsbyBlnImgTag['img']) > 0)) {
    if ($multiEdition) {
?>
,
          edUrlBlnImgLookupByEdn = {<?=$edUrlBlnImgLookupByEdn?>},
          edBlnPosLookupByEdn = {<?=$edBlnPosLookupByEdn?>},//reset and calc'd in getEditionsStructuralViewHtml
          edPolysByBlnTagTokCmpTagByEdn = {<?=$edPolysByBlnTagTokCmpTagByEdn?>},//calc'd for first edition assuming all editions are inclusive
          urlBlnImgLookup = edUrlBlnImgLookupByEdn[<?=$defaultEdnID?>],//get first edition
          blnPosLookup = edBlnPosLookupByEdn[<?=$defaultEdnID?>],//get first edition
          polysByBlnTagTokCmpTag = edPolysByBlnTagTokCmpTagByEdn[<?=$defaultEdnID?>]//get first edition
<?php
    } else {
?>
,
          urlBlnImgLookup = <?=getImageBaselineURLLookup()?>,//reset and calc'd in getEditionsStructuralViewHtml
          blnPosLookup = <?=getBaselinePosByEntityTagLookup()?>,//reset and calc'd in getEditionsStructuralViewHtml
          polysByBlnTagTokCmpTag = <?=getPolygonByBaselineEntityTagLookup()?>//reset and calc'd in getEditionsStructuralViewHtml
<?php
    }
  }
  if ($showTranslationView && $hasTranslation) {
    if ($multiEdition) {
      $edTransStructHtmlByEdn = "";
      $edTransFootnotesByEdn = "";
      $isFirst = true;
      foreach ($ednIDs as $ednID) {
        if (!$isFirst) {
          $edTransStructHtmlByEdn .= ", '$ednID':";
          $edTransFootnotesByEdn .= ", '$ednID':";
        } else {
          $isFirst = false;
          $defaultEdnID = $ednID;
          $edTransStructHtmlByEdn .= "'$ednID':";
          $edTransFootnotesByEdn .= "'$ednID':";
        }
          $edTransStructHtmlByEdn .= getEditionsStructuralTranslationHtml(array($ednID),null,$refreshLookUps);
          $edTransFootnotesByEdn .= getEditionTranslationFootnoteTextLookup();
      }
?>
,
          edTransStructHtmlByEdn = {<?=$edTransStructHtmlByEdn?>},
          edTransFootnotesByEdn = {<?=$edTransFootnotesByEdn?>},
          transStructHtml = edTransStructHtmlByEdn[<?=$defaultEdnID?>]//reset and calc'd in getEditionsStructuralTranslationHtml
          transFootnotes = edTransFootnotesByEdn[<?=$defaultEdnID?>]//reset and calc'd in getEditionsStructuralTranslationHtml
<?php
    } else {
?>
,
          transStructHtml = <?=getEditionsStructuralTranslationHtml($ednIDs,null,$refreshLookUps)?>,
          transFootnotes = <?=getEditionTranslationFootnoteTextLookup()?>//reset and calc'd in getEditionsStructuralTranslationHtml
<?php
    }
  }
  if ($showChayaView && $hasChaya) {
    if ($multiEdition) {
      $edChayaStructHtmlByEdn = "";
      $edChayaFootnotesByEdn = "";
      $isFirst = true;
      foreach ($ednIDs as $ednID) {
        if (!$isFirst) {
          $edChayaStructHtmlByEdn .= ", '$ednID':";
          $edChayaFootnotesByEdn .= ", '$ednID':";
        } else {
          $isFirst = false;
          $defaultEdnID = $ednID;
          $edChayaStructHtmlByEdn .= "'$ednID':";
          $edChayaFootnotesByEdn .= "'$ednID':";
        }
          $edChayaStructHtmlByEdn .= getEditionsStructuralTranslationHtml(array($ednID), Entity::getIDofTermParentLabel('chaya-translation'),$refreshLookUps); //warning!! term dependency
          $edChayaFootnotesByEdn .= getEditionTranslationFootnoteTextLookup();//reset and calc'd in getEditionsStructuralTranslationHtml
      }
?>
,
          edChayaStructHtmlByEdn = {<?=$edChayaStructHtmlByEdn?>},
          edChayaFootnotesByEdn = {<?=$edChayaFootnotesByEdn?>},
          chayaStructHtml = edChayaStructHtmlByEdn[<?=$defaultEdnID?>]//reset and calc'd in getEditionsStructuralTranslationHtml
          chayaFootnotes = edChayaFootnotesByEdn[<?=$defaultEdnID?>]//reset and calc'd in getEditionsStructuralTranslationHtml
<?php
    } else {
?>
,
          chayaStructHtml = <?=getEditionsStructuralTranslationHtml($ednIDs, Entity::getIDofTermParentLabel('chaya-translation'),$refreshLookUps)?>,
          chayaFootnotes = <?=getEditionTranslationFootnoteTextLookup()?>//reset and calc'd in getEditionsStructuralTranslationHtml
<?php
    }
  }
?>
;
    function closeAllPopups(e) {
      var $showing = $('.showing'), $body = $('body');
      if ($showing && $showing.length) {
        $showing.removeClass('showing');
        $showing.jqxTooltip('close'); //close other
      }
      if ($body.hasClass('showTOC')) {
        $body.removeClass('showTOC');
      }
      if (imgViewer) {
        if (imgViewer.$imgMenuPanel && imgViewer.$imgMenuPanel.hasClass('showMenu')) {
          imgViewer.$imgMenuPanel.removeClass('showMenu');
        }
        if (imgViewer.$blnMenuPanel && imgViewer.$blnMenuPanel.hasClass('showMenu')) {
          imgViewer.$blnMenuPanel.removeClass('showMenu');
        }
      }
    }

/**
* handle 'scroll' event for content div
*
* @param object e System event object
*
* @returns true|false
*/

    function viewScrollHandler(e) {
      var top = this.scrollTop + this.offsetTop, viewHeight = this.offsetHeight, minY, hdrSeqTag = null, $secHdrDivs,
          lineSeqTag = null, $lineLblSpans, lineFraction = 0, hdrFraction = 0, imgScrollData = null;
      e.stopImmediatePropagation();
      if (!this.supressSynchOnce) {
        DEBUG.log("event","scroll view top = "+top+" height = "+viewHeight);
        minY = 1000000;
        $lineLblSpans = $(this).find('span.linelabel');
        if ($lineLblSpans.length == 0) {
          $lineLblSpans = $(this).find('span.lineHeader');
        }
        if ($lineLblSpans.length) {
          $lineLblSpans.each(function(index,lblSpan) {
            if (lblSpan.offsetTop + lblSpan.offsetHeight > top) { //visible
              if (lblSpan.offsetTop < minY) {
                lineSeqTag = lblSpan.className.match(/seq\d+/)[0];
                minY = lblSpan.offsetTop;
                lineFraction = (top - lblSpan.offsetTop)/lblSpan.offsetHeight;
              }
            }
          });
        }
        minY = 1000000;
        $secHdrDivs = $(this).find('div.secHeader, div.section');
        if ($secHdrDivs.length) {
          $secHdrDivs.each(function(index,secDiv) {
            if (secDiv.offsetTop + secDiv.offsetHeight> top) { //visible
              if (secDiv.offsetTop < minY) {
                hdrSeqTag = secDiv.className.match(/seq\d+/)[0];
                minY = secDiv.offsetTop;
                hdrFraction = (top - secDiv.offsetTop)/secDiv.offsetHeight;
              }
            }
          });
        }
        closeAllPopups();
//        imgScrollData = this.getImageScrollData(segTag,lineFraction);
        if (lineSeqTag || hdrSeqTag) {
          $('.viewerContent').trigger('synchronize',[this.id,lineSeqTag,lineFraction,hdrSeqTag,hdrFraction,viewHeight,imgScrollData]);
        }
      } else {
        delete this.supressSynchOnce;
      }
      return false;
    };

    /**
    * handle 'synchronize' event for edit div
    *
    * @param object e System event object
    * @param string senderID Identifies the sending view pane for recursion control
    * @param string lineSeqTag tag of line sequence anchor nearest the top of the view
    * @param number lineFraction is the fraction of display viewed relative to the anchor entity
    * @param string hdrSeqTag tag of structure sequence anchor nearest the top of the view
    * @param number hdrFraction is the fraction of display viewed relative to the structure anchor entity
    */

    function synchronizeHandler(e,senderID,lineSeqTag,lineFraction,hdrSeqTag,hdrFraction,scrViewHeight,imgScrollData) {
      var $view = $(this), viewHeight = this.offsetHeight, $anchorElem, scrollElem, yAdjust, visFraction, newTop;
      if (senderID == this.id || !$view.parent().hasClass('syncScroll')) {
        return;
      }
//      DEBUG.log("event","synch request recieved by "+this.id+" from "+senderID+" with lseqID "+ lineSeqTag + (lineFraction?" with lfraction" + lineFraction:""));
//      DEBUG.log("event","synch request recieved by "+this.id+" from "+senderID+" with hseqID "+ hdrSeqTag + (hdrFraction?" with hfraction" + hdrFraction:""));
      $anchorElem = $('span.linelabel.'+lineSeqTag+':first',$view);
      visFraction = lineFraction;
      if (!$anchorElem || !$anchorElem.length) {
        $anchorElem = $('div.secHeader.'+hdrSeqTag+':first',$view);
        visFraction = hdrFraction;
      }
      if (!$anchorElem || !$anchorElem.length) {
        $anchorElem = $('div.section.'+hdrSeqTag+':first',$view);
        visFraction = hdrFraction;
      }
      if ($anchorElem && $anchorElem.length ==1) {
        scrollElem = $anchorElem.get(0);
        newTop = scrollElem.offsetTop - this.offsetTop + scrollElem.offsetHeight * visFraction;
        this.supressSynchOnce = true;
        $view.scrollTop(newTop);
      }
    };


      $(document).ready( function () {
        var
            $textViewer = $('#textViewer'),
            $textViewerHdr = $('#textViewerHdr'),
            $epidocDownloadLink = $('.epidocDownloadLink',$textViewerHdr),
            $textViewerContent = $('#textViewerContent')
<?php
  if (!$isStaticView && $showExportButton) {
    //calculate static view configuration form initial values
    //save in session and use defaults if no session variable
    //todo  figure out a good place to save config based on live viewer context (text or edition or ??)
    if ($entityCfgStaticView) {
      $staticViewSettings = $_SESSION["cfgStaticView$cfgEntityTag"] = $entityCfgStaticView;
    } else if (array_key_exists("cfgStaticView$cfgEntityTag",$_SESSION)) {
      $staticViewSettings = $_SESSION["cfgStaticView$cfgEntityTag"];
    } else {
      $staticViewLayout = 0;
      //leave bit 7 (128) so default to not overwrite.
      if ($exportGlossary){
        $staticViewLayout += 64; //bit 6
      }
      if ($allowImageDownload){
        $staticViewLayout += 32; //bit 5
      }
      if ($allowTeiDownload){
        $staticViewLayout += 16; //bit 4
      }
      if ($showContentOutline){
        $staticViewLayout += 8; //bit 3
      }
      if ($showImageView){
        $staticViewLayout += 4; //bit 2
      }
      if ($showTranslationView){
        $staticViewLayout += 2; //bit 1
      }
      if ($showChayaView){
        $staticViewLayout += 1; //bit 0
      }

      $staticViewSettings = array("fname"=>($text && $text->getCKN()?str_replace(' ','_',trim($text->getCKN())):"tempfname"),
                              "title"=>($title?$title:"unknown title"),
                              "cfgStaticLayout"=>$staticViewLayout);
      $_SESSION["cfgStaticView$cfgEntityTag"] = $staticViewSettings;
    }
    $staticViewSettings["cfgStaticLayout"] = ($staticViewSettings["cfgStaticLayout"] & 127);
?>
,
            $btnExportStatic = $('#btnExportStatic'),
            $btnExportDlg = $('#btnExportDlg'),
            cfgEntityTag='<?=$cfgEntityTag?>',
            staticViewSettings=<?= json_encode($staticViewSettings) ?>
<?php
  }
  if ($showContentOutline) {
?>
,
            $tocNavPanel= $('#tocNavPanel'),
            $tocNavButton= $('.tocNavButton')
<?php
  }
  $cntPanels = 1; //text view will always show
  if ($showImageView && (count($imgURLsbyBlnImgTag['bln']) > 0 || count($imgURLsbyBlnImgTag['img']) > 0)) {
    $cntPanels++;
?>
,
            imageDownload= false,
            $imageViewer= $('#imageViewer'),
            $imageViewerHdr= $('#imageViewerHdr'),
            $imageViewerContent= $('#imageViewerContent')
<?php
  }
  if ($showTranslationView && $hasTranslation) {
    $cntPanels++;
?>
,
            $transViewer = $('#transViewer'),
            $transViewerHdr = $('#transViewerHdr'),
            $transViewerContent = $('#transViewerContent')
<?php
  }
?>
<?php
  if ($showChayaView && $hasChaya) {
    $cntPanels++;
?>
,
            $chayaViewer = $('#chayaViewer'),
            $chayaViewerHdr = $('#chayaViewerHdr'),
            $chayaViewerContent = $('#chayaViewerContent')
<?php
  }
?>
,
           cntPanels = <?=$cntPanels?>,
           avgContentPanelHeight = ($(window).height()-$('.headline').height())/cntPanels - $textViewerHdr.height() -15
;
          $epidocDownloadLink.html('<div class="epidownloadbtndiv"/>');
          if (editionIsPublic) {
            $epidocDownloadLink.attr('href',curEpidocDownloadURL);
            if (!$epidocDownloadLink.hasClass('public')){
              $epidocDownloadLink.addClass('public');
            }
          } else {
            $epidocDownloadLink.attr('href',"#");
            if ($epidocDownloadLink.hasClass('public')){
              $epidocDownloadLink.removeClass('public');
            }
          }
<?php
  if (!$isStaticView && $showExportButton) {
?>
          function exportStaticViewer() {
            var newURL = exportStaticBaseURL;
            if (staticViewSettings['title']){
              newURL += "&title="+staticViewSettings['title'];
            }
            if (staticViewSettings['fname']){
              newURL += "&fname="+staticViewSettings['fname'];
            }
            if (staticViewSettings['cfgStaticLayout']){
              newURL += "&cfgStatic="+staticViewSettings['cfgStaticLayout'];
            }
            if (staticViewSettings['refresh']){
              newURL += "&refreshLookUps=1";
            }
            if (cfgEntityTag && cfgEntityTag.length > 0){
              newURL += "&cfgEntityTag="+cfgEntityTag;
            }
            //make ajax call to export
            $.ajax({
                type:"POST",
                dataType: 'json',
                url: newURL,
                asynch: true,
                success: function (data, status, xhr) {
                    if (data) {
                      showResultsDialog(data);
                    }
                },
                error: function (xhr,status,error) {
                    // add record failed.
                    errStr = "<div class=\"errmsg\">An error occurred while trying to export viewer. Error: " + error+"</div>";
                    showResultsDialog(errStr);
                }
            });// end ajax
          }
//          updateExportStaticLinkURL();
          function showResultsDialog(content) {
            $('#resultsDialogContent').html(content);
            $('#resultsDialog').jqxWindow('open');
          }
          function initResultsDialog() {
            var mainContainer = $('body'),
                offset = mainContainer.offset();
                offset.xcenter = mainContainer.innerWidth()/2;
                offset.ycenter = mainContainer.innerHeight()/2;
                dlgWidth = 400;
                dlgHeight = 200;
            $('#resultsDialog').jqxWindow({  width: dlgWidth,
               height: 200, resizable: true,
                cancelButton: $('#btnResultsCancel'),
                position: { x: offset.left + offset.xcenter - dlgWidth/2, y: offset.top +offset.ycenter - dlgHeight},
//                position: { x: offset.left, y: offset.top},
                initContent: function () {
                }
            });
            $('#resultsDialog').jqxWindow('close');
          }
          initResultsDialog();
          function initSettingsDialog() {
            var mainContainer = $('body'),
                offset = mainContainer.offset();
                offset.xcenter = mainContainer.innerWidth()/2;
                offset.ycenter = mainContainer.innerHeight()/2;
                dlgWidth = 400;
                dlgHeight = 315;
            $('#settingsDialog').jqxWindow({  width: dlgWidth,
                height: dlgHeight, resizable: true,
                cancelButton: $('#btnCancel'),
                position: { x: offset.left + offset.xcenter - dlgWidth/2, y: offset.top +offset.ycenter - dlgHeight/2},
                initContent: function () {
                  var cfgLayout = staticViewSettings.cfgStaticLayout;
                  $('#btnStaticExport').jqxButton({ width: '80px', disabled: false });
                  $('#btnStaticExport').unbind('click').bind('click',function(){
                      var cfgLayoutOrig = staticViewSettings.cfgStaticLayout;
                      staticViewSettings.fname = $('#fname').val();
                      staticViewSettings.title = $('#title').val();
                      var cfgLayout = 0;
                      if ($('#overwritefiles').jqxCheckBox('checked')) {
                        cfgLayout += 128;
                      }
                      if ($('#fullGlossaryCheckBox').jqxCheckBox('checked')) {
                        cfgLayout += 64;
                        if ((cfgLayoutOrig & 64) == 0) { //change from no glossary to full so refresh lookups
                          staticViewSettings['refresh'] = true;
                        }
                      } else if ((cfgLayoutOrig & 64) == 64) { //change to no glossary from full so refresh lookups
                          staticViewSettings['refresh'] = true;
                      }
                      if ($('#dlImagesCheckBox').jqxCheckBox('checked')) {
                        cfgLayout += 32;
                      }
                      if ($('#dlTEI').jqxCheckBox('checked')) {
                        cfgLayout += 16;
                      }
                      if ($('#showTOCCheckBox').jqxCheckBox('checked')) {
                        cfgLayout += 8;
                      }
                      if ($('#showImageCheckBox').jqxCheckBox('checked')) {
                        cfgLayout += 4;
                      }
                      if ($('#showTranslation').jqxCheckBox('checked')) {
                        cfgLayout += 2;
                      }
                      if ($('#showChaya').jqxCheckBox('checked')) {
                        cfgLayout += 1;
                      }
                      staticViewSettings.cfgStaticLayout = cfgLayout;
                      $('#settingsDialog').jqxWindow('close');
                      exportStaticViewer();
                  });
                  $('#btnCancel').jqxButton({ width: '80px', disabled: false });
                  $('#fname').val(staticViewSettings.fname);
                  $('#title').val(staticViewSettings.title);
                  $('#overwritefiles').jqxCheckBox({ width: '150px', checked:(cfgLayout&128?true:false)});
                  $('#fullGlossaryCheckBox').jqxCheckBox({ width: '150px', checked:(cfgLayout&64?true:false)});
                  $('#dlImagesCheckBox').jqxCheckBox({ width: '150px', checked:(cfgLayout&32?true:false)});
                  $('#dlTEI').jqxCheckBox({ width: '150px', checked:(cfgLayout&16?true:false)});
                  $('#showTOCCheckBox').jqxCheckBox({ width: '150px', checked:(cfgLayout&8?true:false)});
                  $('#showImageCheckBox').jqxCheckBox({ width: '150px', checked:(cfgLayout&4?true:false)});
                  $('#showTranslation').jqxCheckBox({ width: '150px', checked:(cfgLayout&2?true:false)});
                  $('#showChaya').jqxCheckBox({ width: '150px', checked:(cfgLayout&1?true:false)});
                }
            });
            $('#settingsDialog').jqxWindow('close');
          }
          initSettingsDialog();
          $btnExportDlg.unbind('click').bind('click', function (e) {
            //open dialog
            $('#settingsDialog').jqxWindow('open');
          });


<?php
  }
  if ($multiEdition && $multiEditionHeaderDivHtml) {
?>
          $textViewerHdr.append('<?=$multiEditionHeaderDivHtml?>');
          $('#edn'+curEdnID,$textViewerHdr).addClass('selected');

          function switchEdition(ednID, isPublished) {
            if (curEdnID == ednID){
              return;
            }
            closeAllPopups();
            setTextViewHtmlandEvents(edStructHtmlByEdn[ednID], edFootnotesByEdn[ednID], edGlossaryLookupByEdn[ednID]);
            editionIsPublic = isPublished;
            curEdnID = ednID;
            curEpidocDownloadURL = ednToEpiDownloadURLs["edn"+curEdnID];
            if (editionIsPublic) {
              $epidocDownloadLink.attr('href',curEpidocDownloadURL);
              if (!$epidocDownloadLink.hasClass('public')){
                $epidocDownloadLink.addClass('public');
              }
            } else {
              $epidocDownloadLink.attr('href',"#");
              if ($epidocDownloadLink.hasClass('public')){
                $epidocDownloadLink.removeClass('public');
              }
            }
<?php
    if ($showContentOutline) {
?>
            setTOCHtmlandEvents(edTocHtmlByEdn[ednID]);
<?php
    }
    if ($showImageView && (count($imgURLsbyBlnImgTag['bln']) > 0 || count($imgURLsbyBlnImgTag['img']) > 0)) {
?>
            if ( imgViewer ) {
              imgViewer.initData(
                edBlnPosLookupByEdn[ednID],
                edUrlBlnImgLookupByEdn[ednID],
                edPolysByBlnTagTokCmpTagByEdn[ednID]);
              imgViewer.initImageUI();
            }
<?php
    }
    if ($showTranslationView && $hasTranslation) {
?>
            setTransViewHtmlandEvents(edTransStructHtmlByEdn[ednID], edTransFootnotesByEdn[ednID]);
<?php
    }
    if ($showChayaView && $hasChaya) {
?>
            setChayaViewHtmlandEvents(edChayaStructHtmlByEdn[ednID], edChayaFootnotesByEdn[ednID]);
<?php
    }
?>
          }
          $('.textEdnButton',$textViewerHdr).unbind('click').bind('click',function(e) {
            var $button = $(this), ednTag = $button.attr('id'), ednID = ednTag.substring(3),
                isPublished = $button.hasClass('published');
            if (!$button.hasClass('selected')) {//ensure skip multiple clicks on selected edition.
              $('.textEdnButton.selected',$textViewerHdr).removeClass('selected');
              $button.addClass('selected');
              //switch to this edition
              switchEdition(ednID,isPublished);
            }
            e.stopImmediatePropagation();
            return false;
          });
<?php
  }
  if ($showContentOutline) {
?>
          function setTOCHtmlandEvents(tocHtml) {
            //initialise toc
            $tocNavPanel.html(tocHtml);
            if (tocHtml) {
              $tocNavButton.show()
              //attach event handlers
              $('.tocEntry',$tocNavPanel).unbind('click').bind('click', function(e) {
                var $body = $('body'),classes = $(this).attr("class"), tocID, seqTag;
                tocID = $(this).attr('id');
                seqTag = tocID.substring(3);
                $body.removeClass('showTOC');
                $('.viewerContent').trigger('synchronize',[tocID,null,0,seqTag,0,null,null]);
                e.stopImmediatePropagation();
                return false;
              });

              $tocNavButton.unbind('click').bind('click', function(e) {
                var $body = $('body');
                if ($body.hasClass('showTOC')) {
                  $body.removeClass('showTOC');
                } else {
                  $body.addClass('showTOC');
                }
                e.stopImmediatePropagation();
                return false;
              });
            } else {
              $tocNavButton.hide();
            }
          }
          if (tocHtml) {
            setTOCHtmlandEvents(tocHtml);//initial setup
          } else {
            $tocNavButton.hide();
          }

<?php
  }
?>
<?php
  if ($showImageView && (count($imgURLsbyBlnImgTag['bln']) > 0 || count($imgURLsbyBlnImgTag['img']) > 0)) {
?>
//initialise imageViewer
            $imageViewer.jqxExpander({expanded:true,
                                      showArrow: false,
                                      expandAnimationDuration:50,
                                      collapseAnimationDuration:50});
            $imageViewerContent.height(''+avgContentPanelHeight+'px');
            imgViewer = new VIEWERS.ImageViewer(
                                                 { initViewPercent:100,
                                                   id:'imageViewerContent',
                                                   dbName: dbName,
                                                   basepath: basepath,
                                                   imageDownload: <?=($allowImageDownload?"true":"false")?>,
                                                   imgViewContainer: $imageViewerContent.get(0),
                                                   imgViewHeader: $imageViewerHdr,
                                                   posLookup: blnPosLookup,
                                                   polygonLookup: polysByBlnTagTokCmpTag,
                                                   imgLookup: urlBlnImgLookup
                                                 });
<?php
  }
?>
//initialise textViewer
          $textViewer.jqxExpander({expanded:true,
                                    showArrow: false,
                                    expandAnimationDuration:50,
                                    collapseAnimationDuration:50});
          $textViewerHdr.unbind('click').bind('click', function(e) {
            if (e.target.nodeName === "A") {
              e.stopImmediatePropagation();
            }
          });
          $textViewerContent.height(''+avgContentPanelHeight+'px');

          function setTextViewHtmlandEvents(edStructHtml,edFootnotes,edGlossaryLookup) {
            $textViewerContent.html(edStructHtml);
            closeAllPopups();
            if (edFootnotes && typeof edFootnotes == 'object' && Object.keys(edFootnotes).length > 0) {
              $('.footnote,.reconstruction',$textViewerContent).unbind('click').bind('click', function(e) {
                var id = this.id, footnoteHtml, $showing;
                  footnoteHtml = (edFootnotes[id]?edFootnotes[id]:"unable to find footnote text or empty footnote");
                  $(this).jqxTooltip({content: '<div class="popupwrapperdiv">'+footnoteHtml+"</div>",
                                      trigger: 'click',
                                      showArrow: false,
                                      autoHide: false });
                  closeAllPopups();
                  $(this).unbind('close').bind('close', function(e) {
                    $(this).jqxTooltip('destroy');
                  });
                  $(this).jqxTooltip('open');
                  $(this).addClass('showing');
                  e.stopImmediatePropagation();
                  return false;
              });
            }
            $textViewerContent.unbind('click').bind('click', function(e) {
              closeAllPopups();
              $('.viewerContent').trigger('updateselection',[$textViewerContent.attr('id'),[]]);
            });
            $('.grpTok',$textViewerContent).unbind('click').bind('click', function(e) {
              var classes = $(this).attr("class"), entTag, entTags, lemTag, lemmaInfo, entGlossInfo,
                  popupHtml = null, $glossaryPopup;
                  //popupHtml = "No lemma info for " + $(this).text();
              if ( entTags = classes.match(/cmp\d+/)) {//use first cmp tag for tool tip
                entTag = entTags[0];
              } else {
                 entTag = classes.match(/tok\d+/);
                 entTag = entTag[0];
              }
              if (edGlossaryLookup && entTag && edGlossaryLookup[entTag]) {
                entGlossInfo = edGlossaryLookup[entTag];
                if (entGlossInfo['lemTag']) {
                  lemmaInfo = edGlossaryLookup[entGlossInfo['lemTag']];
                  if (lemmaInfo && lemmaInfo['entry']) {
                    popupHtml = '<div class="glossHeaderInfoDiv">'+lemmaInfo['entry'];
                    if (entGlossInfo['infHtml']) {
                      popupHtml += entGlossInfo['infHtml'];
                    }
                    popupHtml += '</div>';
                    if (lemmaInfo['attestedHtml'] || lemmaInfo['relatedHtml']) {
<?php
  if (USESCROLLLEMMAPOPUP) {
?>
                      popupHtml += '<div class="glossExtraInfoDiv expanded">';
<?php
  } else {
?>
                      popupHtml += '<div class="glossExpanderDiv"><span class="glossaryExpander">+</span></div>';
                      popupHtml += '<div class="glossExtraInfoDiv">';
<?php
  }
?>
                      if (lemmaInfo['attestedHtml']) {
                        popupHtml += lemmaInfo['attestedHtml'];
                      }
                      if (lemmaInfo['relatedHtml']) {
                        popupHtml += lemmaInfo['relatedHtml'];
                      }
                      popupHtml += '</div>';
                    }
                  }
                }
              }
              $('.viewerContent').trigger('updateselection',[$textViewerContent.attr('id'),[entTag]]);
              closeAllPopups();
              if (popupHtml) {
                $glossExtraInfoDiv = $(this).jqxTooltip({ content: '<div class="popupwrapperdiv">'+popupHtml+"</div>",
                                                           trigger: 'click',
                                                           showArrow: false,
                                                           autoHide: false });
                $(this).unbind('close').bind('close', function(e) {
                  $(this).jqxTooltip('destroy');
                });
                $(this).jqxTooltip('open');
                $('.grpTok.'+entTag,$textViewerContent).addClass('showing');
<?php
  if (!USESCROLLLEMMAPOPUP) {
?>
                $('.glossaryExpander').unbind('click').bind('click', function(e) {
                      var $popupWrapperDiv = $(this).parent().parent(), $expander = $(this),
                          $extraInfoDiv = $('.glossExtraInfoDiv',$popupWrapperDiv);
                      if ($extraInfoDiv.hasClass('expanded')) {
                        $extraInfoDiv.removeClass('expanded');
                        $(this).text('+');
                      } else {
                        $extraInfoDiv.addClass('expanded');
                        $(this).text('-');
                      }
                      e.stopImmediatePropagation();
                      return false;
                });
<?php
  }
?>
              }
              e.stopImmediatePropagation();
              return false;
            });
          }
          setTextViewHtmlandEvents(edStructHtml,edFootnotes,edGlossaryLookup);
    /**
    * handle 'updateselection' event
    *
    * @param object e System event object
    * @param string senderID Identifies the sending editor pane for recursion control
    * @param string array selectionGIDs Global entity ids if entities hovered
    * @param string entTag Entity tag of selection
    */

    function updateSelectionHandler(e,senderID, selectionGIDs) {
      if (senderID == $textViewerContent.attr('id')) {
        return;
      }
      var i, id;
      DEBUG.log("event","selection changed recieved by edition View in "+$textViewerContent.attr('id')+" from "+senderID+" selected ids "+ selectionGIDs.join());
      closeAllPopups();
      //$(".selected", ednVE.contentDiv).removeClass("selected");
      if (selectionGIDs && selectionGIDs.length) {
        $.each(selectionGIDs, function(i,val) {
          var entity ,j,entTag;
          if (val && val.length) {
            entity = $('.'+val,$textViewerContent);
            if (entity && entity.length > 0) {
              entity.addClass("showing");
            }
//             else if (val.match(/^seq/) && ednVE.entTagsBySeqTag[val] && ednVE.entTagsBySeqTag[val].length) {
//              for (j in ednVE.entTagsBySeqTag[val]) {
//                entTag = ednVE.entTagsBySeqTag[val][j];
//                $('.'+entTag,$textViewerContent).addClass("showing");
//              }
//            }
          }
        });
      }
    };

            $textViewerContent.unbind('updateselection').bind('updateselection', updateSelectionHandler);

            //assign handler for all syllable elements
            $textViewerContent.unbind("scroll").bind("scroll", viewScrollHandler);

            $textViewerContent.unbind('synchronize').bind('synchronize', synchronizeHandler);


            $('.linkScroll').unbind('click').bind('click', function(e) {
              var $viewer = $(this).closest('.viewer');
              if ($viewer.hasClass('syncScroll')) {
                $viewer.removeClass('syncScroll');
                $(this).attr('title','sync scroll off');
              } else {
                $viewer.addClass('syncScroll');
                $(this).attr('title','sync scroll on');
              }
              e.stopImmediatePropagation();
              return false;
            });
<?php
  if ($showTranslationView && $hasTranslation) {
?>
//initialise transViewer
            $transViewer.jqxExpander({expanded:true,
                                      showArrow: false,
                                      expandAnimationDuration:50,
                                      collapseAnimationDuration:50});
            $transViewerContent.height(''+avgContentPanelHeight+'px');

            function setTransViewHtmlandEvents(transStructHtml,transFootnotes) {
              $transViewerContent.html(transStructHtml);
              $transViewerContent.unbind('click').bind('click', closeAllPopups);
              if (transFootnotes && typeof transFootnotes == 'object' && Object.keys(transFootnotes).length > 0) {
                $('.footnote,.reconstruction',$transViewerContent).unbind('click').bind('click', function(e) {
                  var id = this.id, footnoteHtml;
                    footnoteHtml = (transFootnotes[id]?transFootnotes[id]:"unable to find footnote text or empty footnote");
                    $(this).jqxTooltip({content: '<div class="popupwrapperdiv">'+footnoteHtml+"</div>",
                                        trigger: 'click',
                                        autoHide: false,
                                        showArrow: false });
                    closeAllPopups();
                    $(this).unbind('close').bind('close', function(e) {
                      $(this).jqxTooltip('destroy');
                    });
                    $(this).jqxTooltip('open');
                    $(this).addClass('showing');
                    e.stopImmediatePropagation();
                    return false;
                });
              }
            }
            setTransViewHtmlandEvents(transStructHtml,transFootnotes);
            //assign handler for all syllable elements
            $transViewerContent.unbind("scroll").bind("scroll", viewScrollHandler);

            $transViewerContent.unbind('synchronize').bind('synchronize', synchronizeHandler);
<?php
  }
?>
<?php
  if ($showChayaView && $hasChaya) {
?>
//initialise chayaViewer
            $chayaViewer.jqxExpander({expanded:true,
                                      showArrow: false,
                                      expandAnimationDuration:50,
                                      collapseAnimationDuration:50});
            $chayaViewerContent.height(''+avgContentPanelHeight+'px');

            function setChayaViewHtmlandEvents(chayaStructHtml,chayaFootnotes) {
              $chayaViewerContent.html(chayaStructHtml);
              $chayaViewerContent.unbind('click').bind('click',closeAllPopups);
              if (chayaFootnotes && typeof chayaFootnotes == 'object' && Object.keys(chayaFootnotes).length > 0) {
                $('.footnote,.reconstruction',$chayaViewerContent).unbind('click').bind('click', function(e) {
                  var id = this.id, footnoteHtml;
                    footnoteHtml = (chayaFootnotes[id]?chayaFootnotes[id]:"unable to find footnote text or empty footnote");
                    $(this).jqxTooltip({content: '<div class="popupwrapperdiv">'+footnoteHtml+"</div>",
                                        trigger: 'click',
                                        autoHide: false,
                                        showArrow: false });
                    closeAllPopups();
                    $(this).unbind('close').bind('close', function(e) {
                      $(this).jqxTooltip('destroy');
                    });
                    $(this).jqxTooltip('open');
                    $(this).addClass('showing');
                    e.stopImmediatePropagation();
                    return false;
                });
              }
            }
            setChayaViewHtmlandEvents(chayaStructHtml,chayaFootnotes);

            //assign handler for all syllable elements
            $chayaViewerContent.unbind("scroll").bind("scroll", viewScrollHandler);

            $chayaViewerContent.unbind('synchronize').bind('synchronize', synchronizeHandler);
<?php
  }
?>
      });
    </script>
  </head>
<body>
<?php
  if ($showContentOutline) {
?>
  <div id="tocNavPanel" class="tocNavPanel"></div>
  <div class="headline"><div class="tocNavButton" title="Table of Contents">&#9776;</div><div class="titleDiv"><?=$title?></div>
<?php
  } else {
?>
  <div class="headline"><div class="titleDiv"><?=$title?></div>
<?php
  }
  if (!$isStaticView && $showExportButton) {
?>
  <button id="btnExportDlg" class="btnExportDlg" title="Export Static Viewer">export html ...</button>
  </div>
<?php
  } else {
?>
  </div>
<?php
  }
  if ($showImageView && (count($imgURLsbyBlnImgTag['bln']) > 0 || count($imgURLsbyBlnImgTag['img']) > 0)) {
?>
    <div id="imageViewer" class="viewer syncScroll">
      <div id="imageViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel"><button class="linkScroll" title="sync scroll off">&#x1F517;</button>Image</div></div>
      <div id="imageViewerContent" class="viewerContent"></div>
    </div>
<?php
  }
?>

    <div id="textViewer" class="viewer syncScroll">
<?php
  if ($allowTeiDownload) {
?>
      <div id="textViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel"><button class="linkScroll" title="sync scroll on">&#x1F517;</button>Text</div><a class="epidocDownloadLink" download href="" title="Download Epidoc TEI">Dl</a></div> <!--&#x2B73;</a></div-->
<?php
  } else {
?>
      <div id="textViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel"><button class="linkScroll" title="sync scroll on">&#x1F517;</button>Text</div></div>
<?php
  }
?>
      <div id="textViewerContent" class="viewerContent">test</div>
    </div>
<?php
  if ($showTranslationView && $hasTranslation) {
?>
    <div id="transViewer" class="viewer syncScroll">
      <div id="transViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel"><button class="linkScroll" title="sync scroll on">&#x1F517;</button>Translation</div></div>
      <div id="transViewerContent" class="viewerContent">test</div>
    </div>
<?php
  }
?>
<?php
  if ($showChayaView && $hasChaya) {
?>
    <div id="chayaViewer" class="viewer syncScroll">
      <div id="chayaViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel"><button class="linkScroll" title="sync scroll on">&#x1F517;</button>Chāyā</div></div>
      <div id="chayaViewerContent" class="viewerContent">test</div>
    </div>
<?php
  }
?>
<?php
  if (!$isStaticView && $showExportButton) {
?>
    <div id="settingsDialog">
        <div id="settingsDialogHeader">
            <span id="captureContainer" style="float: left">Export Viewer Settings</span>
        </div>
        <div id="settingsDialogContent" style="overflow: hidden">
            <div style="margin: 10px">
              <div class="dlgInputBox">
                <span id="lblFName" class="dlgInputLabel">Filename  :</span>
                <input type="text" class="dlgInput" id="fname" />
              </div>
              <div class="dlgInputBox">
                <span id="lblTitle" class="dlgInputLabel">View Title :</span>
                <input type="text" class="dlgInput" id="title" />
              </div>
              <div class="dlgResourceBox">
                <span class="dlgOptionsGroupLabel">include :</span>
                <div id="resourceOptions" >
                  <div id="fullGlossaryCheckBox" class="dlgCheckBox bit64">full glossary</div>
                  <div id="dlImagesCheckBox"  class="dlgCheckBox bit32">download images</div>
                  <div id="dlTEI"  class="dlgCheckBox bit16">download TEI</div>
                </div>
              </div>
              <div class="dlgResourceBox">
                <span class="dlgViewOptionsGroupLabel">show :</span>
                <div id="viewOptions" >
                  <div id="showTOCCheckBox"  class="dlgCheckBox bit8">TOC</div>
                  <div id="showImageCheckBox"  class="dlgCheckBox bit4">images</div>
                  <div id="showTranslation"  class="dlgCheckBox bit2">translation</div>
                  <div id="showChaya"  class="dlgCheckBox bit1">chāyā</div>
                </div>
              </div>
              <div class="dlgResourceBox">
                <span class="dlgOutputGroupLabel">update :</span>
                <div id="outputOptions" >
                  <div id="overwritefiles"  class="dlgCheckBox bit128">Overwrite existing files</div>
                </div>
              </div>
              <div style="float: right">
                  <input type="button" class="dlgButton" value="Export" style="margin-bottom: 5px;" id="btnStaticExport" />
                  <input type="button" class="dlgButton" value="Cancel" id="btnCancel" />
              </div>
            </div>
        </div>
    </div>
    <div id="resultsDialog">
        <div id="resultsDialogHeader">
            <span style="float: left">Export Viewer Results</span>
        </div>
        <div>
          <div id="resultsDialogContent" style="overflow: hidden">
          </div>
          <div style="float: right">
              <input type="button" class="dlgButton" value="Cancel" id="btnResultsCancel" />
          </div>
        </div>
    </div>
<?php
  }
?>
</body>
</html>
<?php

  function returnXMLErrorMsgPage($msg) {
    die("<?xml version='1.0' encoding='UTF-8'?>\n<error>$msg</error>");
  }
?>
