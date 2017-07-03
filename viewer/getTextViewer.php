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
  require_once (dirname(__FILE__) . '/php/testdata.php');//get user access control
  $dbMgr = new DBManager();
  $data = (array_key_exists('data',$_REQUEST)? json_decode($_REQUEST['data'],true):$_REQUEST);
  if (!$data) {
    returnXMLErrorMsgPage("invalid viewer request - not enough or invalid parameters");
  } else {
    if ( isset($data['ednID'])) {//required
      $ednID = $data['ednID'];
      $glossaryEntTag = "edn".$ednID;
      $edition = new Edition($ednID);
      if ($edition->hasError()) {
        returnXMLErrorMsgPage("unable to load edition - ".join(",",$edition->getErrors()));
      }
      $text = $edition->getText(true);
      if (!$text) {
        returnXMLErrorMsgPage("invalid viewer request - access denied");
      }
      $title = ($text->getCKN()?$text->getCKN()." ∙ ":"").$text->getTitle();
    } else {
      returnXMLErrorMsgPage("invalid viewer request - not enough or invalid parameters");
    }
    if ( isset($data['catID'])) {//optional override
      $glossaryEntTag = "cat".$data['catID'];
    }
  }
  $showContentOutline = defined("SHOWVIEWERCONTENTOUTLINE")?SHOWVIEWERCONTENTOUTLINE:true;
  $showImageView = defined("SHOWIMAGEVIEW")?SHOWIMAGEVIEW:true;
  $showTranslationView = defined("SHOWTRANSLATIONVIEW")?SHOWTRANSLATIONVIEW:true;
  $showChayaView = defined("SHOWCHAYAVIEW")?SHOWCHAYAVIEW:true;

  //TODO add code to ensure that baseline/images exist, translation exist and CHAYA exist
  $blnIDs = array(1);
  $hasTranslation = true;
  $hasChaya = true;
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
    <script src="/jquery/jquery-1.11.0.min.js"></script>
    <script src="/jqwidget/jqwidgets/jqxcore.js"></script>
    <script src="/jqwidget/jqwidgets/jqxtouch.js"></script>
    <script src="/jqwidget/jqwidgets/jqxdata.js"></script>
    <script src="/jqwidget/jqwidgets/jqxtabs.js"></script>
    <script src="/jqwidget/jqwidgets/jqxdropdownbutton.js"></script>
    <script src="/jqwidget/jqwidgets/jqxbuttons.js"></script>
    <script src="/jqwidget/jqwidgets/jqxbuttongroup.js"></script>
    <script src="/jqwidget/jqwidgets/jqxradiobutton.js"></script>
    <script src="/jqwidget/jqwidgets/jqxscrollbar.js"></script>
    <script src="/jqwidget/jqwidgets/jqxexpander.js"></script>
    <script src="/jqwidget/jqwidgets/jqxnavigationbar.js"></script>
    <script src="/jqwidget/jqwidgets/jqxinput.js"></script>
    <script src="/jqwidget/jqwidgets/jqxdragdrop.js"></script>
    <script src="/jqwidget/jqwidgets/jqxgrid.js"></script>
    <script src="/jqwidget/jqwidgets/jqxgrid.pager.js"></script>
    <script src="/jqwidget/jqwidgets/jqxgrid.selection.js"></script>
    <script src="/jqwidget/jqwidgets/jqxgrid.filter.js"></script>
    <script src="/jqwidget/jqwidgets/jqxgrid.sort.js"></script>
    <script src="/jqwidget/jqwidgets/jqxmenu.js"></script>
    <script src="/jqwidget/jqwidgets/jqxwindow.js"></script>
    <script src="/jqwidget/jqwidgets/jqxdocking.js"></script>
    <script src="/jqwidget/jqwidgets/jqxsplitter.js"></script>
    <script src="/jqwidget/jqwidgets/jqxdropdownlist.js"></script>
    <script src="/jqwidget/jqwidgets/jqxlistbox.js"></script>
    <script src="/jqwidget/jqwidgets/jqxinput.js"></script>
    <script src="/jqwidget/jqwidgets/jqxtooltip.js"></script>
    <script src="/jqwidget/jqwidgets/jqxcheckbox.js"></script>
    <script src="/jqwidget/jqwidgets/jqxvalidator.js"></script>
    <script src="/jqwidget/jqwidgets/jqxpanel.js"></script>
    <script src="/jqwidget/jqwidgets/jqxtree.js"></script>
    <script type="text/javascript">
      var sktSort = ('<?=USESKTSORT?>' == "0" || !'<?=USESKTSORT?>')?false:true,
          maxUploadSize = parseInt(<?=MAX_UPLOAD_SIZE?>),
          linkToSyllablePattern = '<?=defined("LINKSYLPATTERN")?LINKSYLPATTERN:""?>',
          progressInputName='<?php echo ini_get("session.upload_progress.name"); ?>',
          dbName = '<?=DBNAME?>',
          basepath="<?=SITE_BASE_PATH?>";
      var testHtml = '<?=getEditionStructuralViewHtml($edition->getID());?>',
            footnotes = <?=getEditionFootnoteText();?>,
            testTrans = <?=$testTrans?>,
            glossaryLookup = <?=getEditionGlossaryLookup($glossaryEntTag)?>,
            transfootnotes = {<?=$transfootnotes?>},
            testHtmlSmall = <?=$testHtmlSmall?>;

    </script>
    <script src="../editors/js/utility.js"></script>
    <script src="../editors/js/debug.js"></script>
    <script type="text/javascript">
      $(document).ready( function () {
        var
<?php
  if ($showImageView && count($blnIDs) > 0) {
?>
            $imageViewer= $('#imageViewer'),
            $imageViewerHdr= $('#imageViewerHdr'),
            $imageViewerContent= $('#imageViewerContent')

<?php
  }
?>
,
            $textViewer = $('#textViewer'),
            $textViewerHdr = $('#textViewerHdr'),
            $textViewerContent = $('#textViewerContent')
<?php
  if ($showTranslationView && $hasTranslation) {
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
?>
,
            $chayaViewer = $('#chayaViewer'),
            $chayaViewerHdr = $('#chayaViewerHdr'),
            $chayaViewerContent = $('#chayaViewerContent')
<?php
  }
?>
;
<?php
  if ($showImageView && count($blnIDs) > 0) {
?>
            $imageViewer.jqxExpander({expanded:true,
                                      showArrow: false,
                                      expandAnimationDuration:50,
                                      collapseAnimationDuration:50});
            $imageViewerContent.html(testHtmlSmall);
            $imageViewerContent.height('150px');
<?php
  }
?>
            $textViewer.jqxExpander({expanded:true,
                                      showArrow: false,
                                      expandAnimationDuration:50,
                                      collapseAnimationDuration:50});
            $textViewerContent.html(testHtml);
//            $textViewerContent.html(testHtmlSmall);
            $textViewerContent.height('150px');
            if (footnotes && typeof footnotes == 'object' && Object.keys(footnotes).length > 0) {
              $('.footnote',$textViewerContent).unbind('click').bind('click', function(e) {
                var id = this.id, footnoteHtml;
                  footnoteHtml = (footnotes[id]?footnotes[id]:"unable to find footnote text or empty footnote");
                  $(this).jqxTooltip({content: '<div class="popupwrapperdiv">'+footnoteHtml+"</div>",
                                      trigger: 'click',
                                      autoHide: false });
                  $('.showing').removeClass('showing');
                  $(this).unbind('close').bind('close', function(e) {
                    $('.showing').removeClass('showing');
                    $(this).jqxTooltip('destroy');
                  });
                  $(this).jqxTooltip('open');
                  $(this).addClass('showing');
                  e.stopImmediatePropagation();
                  return false;
              });
            }
            $textViewerContent.bind('click', function(e) {
              var $showing = $('.showing');
              if ($showing && $showing.length) {
                $showing.removeClass('showing');
                $showing.jqxTooltip('close');
              }
            });
            $('.grpTok',$textViewerContent).unbind('click').bind('click', function(e) {
              var classes = $(this).attr("class"), entTag, entTags, lemTag, lemmaInfo, entGlossInfo
                  popupHtml = "No lemma info for " + $(this).text();
              if ( entTags = classes.match(/cmp\d+/)) {//use first cmp tag for tool tip
                entTag = entTags[0];
              } else {
                 entTag = classes.match(/tok\d+/)
              }
              if (entTag && glossaryLookup[entTag]) {
                entGlossInfo = glossaryLookup[entTag];
                if (entGlossInfo['lemTag']) {
                  lemmaInfo = glossaryLookup[entGlossInfo['lemTag']];
                  if (lemmaInfo && lemmaInfo['entry']) {
                    popupHtml = lemmaInfo['entry'];
                    if (entGlossInfo['infHtml']) {
                      popupHtml += entGlossInfo['infHtml'];
                    }
                    if (lemmaInfo['attestedHtml']) {
                      popupHtml += "<br/>"+lemmaInfo['attestedHtml'];
                    }
                  }
                }
              }
              $(this).jqxTooltip({ content: '<div class="popupwrapperdiv">'+popupHtml+"</div>",
                                   trigger: 'click',
                                   autoHide: false });
              $('.showing').trigger('close'); //close other
              $(this).unbind('close').bind('close', function(e) {
                $('.showing').removeClass('showing');
                $(this).jqxTooltip('destroy');
              });
              $(this).jqxTooltip('open');
              $(this).addClass('showing');
              e.stopImmediatePropagation();
              return false;
            });
<?php
  if ($showTranslationView && $hasTranslation) {
?>
            $transViewer.jqxExpander({expanded:true,
                                      showArrow: false,
                                      expandAnimationDuration:50,
                                      collapseAnimationDuration:50});
            $transViewerContent.html(testTrans);
            $transViewerContent.height('150px');
            $transViewerContent.bind('click', function(e) {
              var $showing = $('.showing');
              if ($showing && $showing.length) {
                $showing.removeClass('showing');
                $showing.jqxTooltip('close');
              }
            });
            if (transfootnotes && typeof transfootnotes == 'object' && Object.keys(transfootnotes).length > 0) {
              $('.footnote',$transViewerContent).unbind('click').bind('click', function(e) {
                var id = this.id, footnoteHtml;
                  footnoteHtml = (transfootnotes[id]?transfootnotes[id]:"unable to find footnote text or empty footnote");
                  $(this).jqxTooltip({content: footnoteHtml,
                                      trigger: 'click',
                                      autoHide: false,
                                      showArrow: false });
                  $('.showing').removeClass('showing');
                  $(this).unbind('close').bind('close', function(e) {
                    $('.showing').removeClass('showing');
                    $(this).jqxTooltip('destroy');
                  });
                  $(this).jqxTooltip('open');
                  $(this).addClass('showing');
                  e.stopImmediatePropagation();
                  return false;
              });
            }

<?php
  }
?>
<?php
  if ($showChayaView && $hasChaya) {
?>
            $chayaViewer.jqxExpander({expanded:true,
                                      showArrow: false,
                                      expandAnimationDuration:50,
                                      collapseAnimationDuration:50});
            $chayaViewerContent.html(testHtml);
            $chayaViewerContent.height('150px');
<?php
  }
?>
      });
    </script>
  </head>
<body>
  <div class="headline"><?=$title?></div>
<?php
  if ($showImageView && count($blnIDs) > 0) {
?>
    <div id="imageViewer" class="viewer">
      <div id="imageViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel">Image</div></div>
      <div id="imageViewerContent" class="viewerContent">test</div>
    </div>
<?php
  }
?>

    <div id="textViewer" class="viewer">
      <div id="textViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel">Text</div></div>
      <div id="textViewerContent" class="viewerContent">test</div>
    </div>
<?php
  if ($showTranslationView && $hasTranslation) {
?>
    <div id="transViewer" class="viewer">
      <div id="transViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel">Translation</div></div>
      <div id="transViewerContent" class="viewerContent">test</div>
    </div>
<?php
  }
?>
<?php
  if ($showChayaView && $hasChaya) {
?>
    <div id="chayaViewer" class="viewer">
      <div id="chayaViewerHdr" class="viewerHeader"><div class="viewerHeaderLabel">Chāyā</div></div>
      <div id="chayaViewerContent" class="viewerContent">test</div>
    </div>
<?php
  }
?>
</body>
</html>
<?php
  function returnXMLSuccessMsgPage($msg) {
    die("<html><body><success>$msg</success></body></html>");
  }

  function returnXMLErrorMsgPage($msg) {
    die("<?xml version='1.0' encoding='UTF-8'?>\n<error>$msg</error>");
  }
?>