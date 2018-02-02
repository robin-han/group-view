var df = df || (df = {});

(function ($, df, undefined) {
    'use strict';

     var _extends = function(d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __(){this.constructor = d;}
        __.prototype = b.prototype;
        d.prototype = new __();
     };

    //#region DfGroupsView
    var EVENT_NS = '.dfGroupsView';

    var EVENTS = {
        GroupToolbarItemClicked: 'GroupToolbarItemClicked',
        GroupRenaming: 'GroupRenaming',
        GroupRenamed: 'GroupRenamed',
        GroupStateChanged: 'GroupStateChanged',
        DragStart: 'DragStart',
        DragEnd: 'DragEnd',
        BeforeDrop: 'BeforeDrop',
        Drop: 'Drop',
        ActiveItemChanging: 'ActiveItemChanging',
        ActiveItemChanged: 'ActiveItemChanged',
        SelectedItemsChanged: 'SelectedItemsChanged',
        ItemClick: 'ItemClick',
    };
    df.DfGroupsViewEvents = EVENTS;

    var Orientation = {
        None: 0,
        Horizontal: 1,
        Vertical: 2
    };
    df.DfOrientation = Orientation;

    function DfGroupsView(element) {
        var self = this;

        self._activeItemView = null;
        self._selectedItems = [];

        self._activeGroupView = null;

        self._orientation = Orientation.Vertical;

        self._canGroup = true;
        self._canReorder = true;
        self._canRenameGroup = false;

        self._toolbarItems = [];

        self._eventSuspended = 0;

        var $host = $("<div class='df-groups-view'></div>");
        $host.data('groupsView', self);

        $host.appendTo(element);
        self._$host = $host;

        var Utils = df.utils;
        $host.on('contextmenu' + EVENT_NS, Utils.createEventHandler(self, self._onGroupsViewContextMenu));
        $host.on('mousedown' + EVENT_NS, Utils.createEventHandler(self, self._onGroupsViewMouseDown));
        $host.on('click' + EVENT_NS, Utils.createEventHandler(self, self._onGroupsViewClick));
    }

    Object.assign(DfGroupsView.prototype, {
        getActiveItem: function () {
            var $activeItemView = this._activeItemView;
            return ($activeItemView && this._getItemData($activeItemView));
        },
        getActiveItemIndex: function () {
            var activeItem = this.getActiveItem();
            var allItems = this.getAllItems();
            for (var i = 0, count = allItems.length; i < count; i++) {
                if (activeItem === allItems[i]) {
                    return i;
                }
            }
            return -1;
        },
        setActiveItem: function (item) {
            var $itemView = this._getItemView(item);
            this._setActiveItemView($itemView);
        },

        getSelectedItems: function () {
            var selectedItems = [];
            Array.prototype.push.apply(selectedItems, this._selectedItems);
            return selectedItems;
        },
        clearSelectedItems: function () {
            var oldSelectedItems = this.getSelectedItems();
            this._clearSelectedItems();
            this._triggerSelectedItemsChanged(oldSelectedItems, []);
        },
        selectItem: function (item) {
            var $itemView = this._getItemView(item);
            if (!$itemView) {
                return;
            }

            var oldSelectedItems = this.getSelectedItems();
            this._addSelectedItems([$itemView]);
            this._triggerSelectedItemsChanged(oldSelectedItems, this._selectedItems);
        },
        unSelectItem: function (item) {
            var $itemView = this._getItemView(item);
            if (!$itemView) {
                return;
            }

            var oldSelectedItems = this.getSelectedItems();
            this._removeSelectedItem($itemView);
            this._triggerSelectedItemsChanged(oldSelectedItems, this._selectedItems);
        },

        getItems: function (groupId) {
            var items = [];

            var $groupView = (groupId && this._getGroupView(groupId));
            if ($groupView) {
                var itemViews = this._getItemViews($groupView);
                for (var i = 0, count = itemViews.length; i < count; i++) {
                    items.push(this._getItemData(itemViews[i]));
                }
            }

            return items;
        },
        getAllItems: function () {
            var items = [];

            //if (this.hasGrouped()) {
            //    var groupViews = this._getGroupViews();
            //    for (var i = 0, groupCount = groupViews.length; i < groupCount; i++) {
            //        var itemViews = this._getItemViews(groupViews[i]);
            //        for (var j = 0, itemCount = itemViews.length; j < itemCount; j++) {
            //            items.push(this._getItemData(itemViews[j]));
            //        }
            //    }
            //} else {
            var itemViews = this._getItemViews(this._getContainer());
            for (var i = 0, count = itemViews.length; i < count; i++) {
                items.push(this._getItemData(itemViews[i]));
            }
            //}

            return items;
        },
        getItemIndex: function (item) {
            if (item) {
                var allItems = this.getAllItems();
                return this._getItemIndex(allItems, item);
            }
            return -1;
        },
        addItem: function (item) {
            var $itemView = this._createItemView(item);

            if (this.hasGrouped()) {
                var $groupView = this._getAddItemGroup();
                if ($groupView) {
                    this._getGroupBody($groupView).append($itemView);
                }
            } else {
                var $container = this._getContainer(true);
                $container.append($itemView);
            }
        },
        insertItem: function (item, index) {
            if (index < 0 || index === undefined) {
                return;
            }

            var $itemView = this._createItemView(item);

            var $container = this._getContainer(true);
            var itemViews = this._getItemViews($container);
            if (this.hasGrouped()) {
                if (index < itemViews.length) {
                    if (index === 0) {
                        $itemView.insertBefore(itemViews[index]);
                    } else {
                        $itemView.insertAfter(itemViews[index - 1]);
                    }
                } else {
                    var $groupView = this._getAddItemGroup();
                    if ($groupView) {
                        this._getGroupBody($groupView).append($itemView);
                    }
                }
            } else {
                if (index < itemViews.length) {
                    $itemView.insertBefore(itemViews[index]);
                } else {
                    $container.append($itemView);
                }
            }
        },
        _getAddItemGroup: function () {
            var $activeGroupView = this._activeGroupView;
            if ($activeGroupView) {
                return $activeGroupView;
            } else {
                var groupViews = this._getGroupViews();
                return groupViews[groupViews.length - 1];
            }
        },
        addItemToGroup: function (groupId, item) {
            if (!this.hasGrouped()) {
                return;
            }

            var $groupView = this._getGroupView(groupId);
            if ($groupView) {
                var $itemView = this._createItemView(item);
                this._getGroupBody($groupView).append($itemView);
            }
        },
        removeItem: function (item) {
            var $removedItemView = this._getItemView(item);

            if ($removedItemView) {
                this._removeSelectedItem($removedItemView);
                if (this._isActiveGroupView($removedItemView)) {
                    this._setActiveItemView(null);
                }

                $removedItemView.off();
                $removedItemView.removeData();
                $removedItemView.detach();
            }
        },

        moveDown: function () {
            var self = this;

            var allItemViews = self._getItemViews(self._getContainer());

            var activeIndex = self.getActiveItemIndex();
            if (activeIndex < 0 || activeIndex >= allItemViews.length - 1) {
                return;
            }

            var $activeItemView = allItemViews[activeIndex];
            var $nextItemView = allItemViews[activeIndex + 1];

            var activeItem = self._getItemData($activeItemView);
            self.removeItem($activeItemView);
            self._setItemData($activeItemView, activeItem);

            $activeItemView.insertAfter($nextItemView);
            self.setActiveItem($activeItemView);
            $activeItemView[0].scrollIntoView(false);
        },
        moveUp: function () {
            var self = this;

            var activeIndex = self.getActiveItemIndex();
            if (activeIndex <= 0) {
                return;
            }

            var allItemViews = self._getItemViews(self._getContainer());
            var $activeItemView = allItemViews[activeIndex];
            var $prevItemView = allItemViews[activeIndex - 1];

            var activeItem = self._getItemData($activeItemView);
            self.removeItem($activeItemView);
            self._setItemData($activeItemView, activeItem);

            $activeItemView.insertBefore($prevItemView);
            self.setActiveItem($activeItemView);
            $activeItemView[0].scrollIntoView(false);
        },

        clear: function () {
            this._activeItemView = null;
            this._activeGroupView = null;
            this._clearSelectedItems();

            var $container = this._getContainer();
            var $groupElems = $container.find('.view-element');
            $groupElems.off();
            $groupElems.removeData();
            $groupElems.detach();

            $container.off();
            $container.removeData();
            $container.detach();
        },
        clearAll: function () {
            this._activeItemView = null;
            this._activeGroupView = null;
            this._clearSelectedItems();
            this._getContainer().remove();
        },

        orientation: function () {
            if (arguments.length === 0) {
                return this._orientation;
            }

            if (this._orientation !== orientation) {
                this._orientation = orientation;
                this.refresh();
            }
        },

        canReorder: function (value) {
            if (arguments.length === 0) {
                return this._canReorder;
            }

            if (this._canReorder !== value) {
                this._canReorder = value;

                var $container = this._getContainer();
                var $groupHeaders = $container.find('.df-group-view-header');
                var $groupItems = $container.find('.df-group-view-item-container');
                if (value) {
                    $groupHeaders.attr('draggable', true);
                    $groupItems.attr('draggable', true);
                } else {
                    $groupHeaders.removeAttr('draggable');
                    $groupItems.removeAttr('draggable');
                }
            }
        },
        canGroup: function (value) {
            if (arguments.length === 0) {
                return this._canGroup;
            }
            this._canGroup = value;
        },
        canRenameGroup: function (value) {
            if (arguments.length === 0) {
                return this._canRenameGroup;
            }
            this._canRenameGroup = value;
        },
        hasGrouped: function () {
            return (this._getContainer().has('.df-group-view-container').length > 0);
        },
        groupItem: function (item) {
            if (!this._canGroup) {
                return;
            }

            var $itemView = this._getItemView(item);
            if (!$itemView) {
                return;
            }

            var activeItem = this.getActiveItem();

            if (this.hasGrouped()) {
                var $oldGroupView = this._getGroupView($itemView);

                var newGroup = new DfGroup(this.newGroupId());
                newGroup.setHeader('Untitled Group');

                var $nextAll = $itemView.nextAll();
                var $newGroupView = this._createGroupView(newGroup);
                var $newGroupViewBody = this._getGroupBody($newGroupView);
                $newGroupViewBody.append($itemView);
                $newGroupViewBody.append($nextAll);

                $newGroupView.insertAfter($oldGroupView);
            } else {
                var $container = this._getContainer();

                var $itemViews1 = $itemView.prevAll().toArray().reverse();
                var $itemViews2 = $itemView.nextAll();

                if ($itemViews1.length > 0) {
                    var newGroup1 = new DfGroup(this.newGroupId());
                    newGroup1.setHeader('Default Group');
                    var $newGroupView1 = this._createGroupView(newGroup1);
                    this._getGroupBody($newGroupView1).append($itemViews1);
                    $container.append($newGroupView1);
                }

                var newGroup2 = new DfGroup(this.newGroupId());
                newGroup2.setHeader('Untitled Group');
                var $newGroupView2 = this._createGroupView(newGroup2);
                var $newGroupViewBody2 = this._getGroupBody($newGroupView2);
                $newGroupViewBody2.append($itemView);
                $newGroupViewBody2.append($itemViews2);
                $container.append($newGroupView2);
            }

            this.setActiveItem(activeItem);
        },
        getItemGroup: function (item) {
            if (this.hasGrouped()) {
                var $itemView = this._getItemView(item);
                var $groupView = $itemView && this._getGroupView($itemView);
                if ($groupView) {
                    return this._getGroupData($groupView);
                }
            }
        },

        getGroupItems: function (groupId) {
            var groupData = this.getGroup(groupId);
            if (groupData) {
                return groupData.items;
            }
        },
        getGroup: function (groupId) {
            var groupViews = this._getGroupViews();
            for (var i = 0, count = groupViews.length; i < count; i++) {
                var $groupView = groupViews[i];
                if ($groupView.data('group').getId() === groupId) {
                    return this._getGroupData($groupView);
                }
            }
        },
        getGroups: function () {
            var groups = [];

            var groupViews = this._getGroupViews();
            for (var i = 0, count = groupViews.length; i < count; i++) {
                groups.push(this._getGroupData(groupViews[i]));
            }

            return groups;
        },
        _getGroupData: function ($groupView) {
            var dfGroup = ($groupView && $groupView.data('group'));
            if (!dfGroup) {
                return;
            }

            var groupData = dfGroup.toJSON();

            var items = [];
            var itemViews = this._getItemViews($groupView);
            for (var i = 0, count = itemViews.length; i < count; i++) {
                items.push(this._getItemData(itemViews[i]));
            }
            groupData['items'] = items;

            return groupData;
        },
        _getItemData: function ($itemView) {
            if ($itemView) {
                return $itemView.data('item');
            }
        },
        _setItemData: function ($itemView, item) {
            if ($itemView) {
                return $itemView.data('item', item);
            }
        },

        addGroup: function (groupData) {
            if (!this._canGroup) {
                return;
            }

            var $container = this._getContainer();
            if (this.hasGrouped() || $container.length === 0 || $container.children().length === 0) {

                var dfGroup = new DfGroup();
                dfGroup.fromJSON(groupData);

                var $groupView = this._createGroupView(dfGroup, groupData.items);

                if ($container.length === 0) {
                    $container = this._creatContainer();
                    $container.appendTo(this._$host);
                }
                $container.append($groupView);
            }
        },
        removeGroup: function (groupId) {
            if (!this.hasGrouped()) {
                return;
            }

            var $groupView = this._getGroupView(groupId);
            if (!$groupView) {
                return;
            }

            var activeItem = this.getActiveItem();

            var $itemsViews = this._getItemViews($groupView);
            var $prevGroupView = $groupView.prev();
            if ($prevGroupView.length > 0) {
                this._addGroupItemView($prevGroupView, $itemsViews);
                $groupView.remove();
            } else if (this.getGroups().length === 1) {
                this.clearGroup();
            } else {
                var $nextGroupView = $groupView.next();
                this._addGroupItemView($nextGroupView, $itemsViews);
                $groupView.remove();
            }

            this.setActiveItem(activeItem);
        },
        clearGroup: function () {
            if (!this.hasGrouped()) {
                return;
            }

            var activeItem = this.getActiveItem();
            var items = this.getAllItems();
            this.createByItems(items);
            this.setActiveItem(activeItem);
            this._activeGroupView = null;
        },
        renameGroup: function (groupId, newName) {
            var $groupView = this._getGroupView(groupId);
            if ($groupView) {
                var group = $groupView.data('group');
                var oldName = group.getHeader();
                if (newName !== oldName) {
                    group.setHeader(newName);

                    var $groupHeader = $groupView.children('.df-group-view-header');
                    var $text = $groupHeader.children('.df-group-view-header-text');
                    $text.text(newName);
                    $text.attr('title', newName);
                    this.trigger(EVENTS.GroupRenamed, { group: group.toJSON(), newName: newName, oldName: oldName });
                }
            }
        },

        getActiveGroup: function () {
            return this._getGroupData(this._activeGroupView);
        },
        setActiveGroup: function (groupId) {
            if (!this.hasGrouped()) {
                return;
            }

            var $groupView;
            if (groupId !== undefined && groupId !== null) {
                $groupView = this._getGroupView(groupId);
                if (!$groupView) {
                    return;
                }
            }
            this._setActiveGroupView($groupView);
        },

        collapseAll: function () {
            var groupViews = this._getGroupViews();
            for (var i = 0, count = groupViews.length; i < count; i++) {
                this._setGroupState(groupViews[i], false);
            }
        },
        expandAll: function () {
            var groupViews = this._getGroupViews();
            for (var i = 0, count = groupViews.length; i < count; i++) {
                this._setGroupState(groupViews[i], true);
            }
        },
        expandGroup: function (groupId, expand) {
            if (!this.hasGrouped()) {
                return;
            }

            var $groupView = this._getGroupView(groupId);
            if (!$groupView) {
                return;
            }
            this._setGroupState($groupView, expand);
        },
        _setGroupState: function ($group, expand) {
            var group = $group.data('group');
            if (!group) {
                return;
            }

            var isHorizontal = (this._orientation === Orientation.Horizontal);

            var $groupHeader = this._getGroupHeader($group);
            var $groupBody = this._getGroupBody($group);
            var $groupState = this._getGroupState($group);

            $groupState.removeClass('fa fa-angle-right fa-angle-down');
            $groupHeader.css('width', '100%');

            if (expand) {
                $groupBody.show();

                $group.removeClass('group-collapsed');
                $groupHeader.removeClass('group-collapsed');

                if (isHorizontal) {
                    $groupState.addClass('fa fa-angle-right');
                } else {
                    $groupState.addClass('fa fa-angle-down');
                }
            } else {
                $groupBody.hide();

                $group.addClass('group-collapsed');
                $groupHeader.addClass('group-collapsed');

                $groupState.addClass('fa fa-angle-right'); //horizontal orientaion will be rotate, so same with vertical

                if (isHorizontal) { //group header will rotate 90, so its width should be same as its contain's height
                    $groupHeader.css('width', $group.height());
                }
            }

            var oldValue = group.getCollapsed();
            var newValue = !expand;
            if (newValue !== oldValue) {
                group.setCollapsed(newValue);
                this.trigger(EVENTS.GroupStateChanged, { newValue: newValue, oldValue: oldValue, groupView: this });
            }
        },

        newGroupId: function () {
            var ids = [];
            var groupViews = this._getGroupViews();
            for (var i = 0, count = groupViews.length; i < count; i++) {
                ids.push(groupViews[i].data('group').getId());
            }
            ids.sort(function (a, b) {
                return (a - b);
            });

            var count = ids.length;
            if (count > 0) {
                for (var i = 0; i < count; i++) {
                    if (ids[i] !== i + 1) {
                        return (i + 1);
                    }
                }
                return count + 1;
            }
            return 1;
        },
        setToolbarItems: function (toolbarItems) {
            this._toolbarItems = (toolbarItems || []);

            var $container = this._getContainer();
            var $groupToolbar = $container.find('.df-group-view-toolbar');
            $groupToolbar.empty();
            this._createGroupToolbarItemView($groupToolbar, this._toolbarItems);
        },
        startDragItem: function (item, evt) {
            if (!item) {
                return;
            }

            var $itemsView = this._createItemView(item);
            this._startDragItem($itemsView, evt);
            var scrollbar = this._$host.data('scrollbar');
            if (scrollbar) {
                scrollbar.startDrag();
            }
        },
        updateScrollbar: function () {
            var scrollbar = this._$host.data('scrollbar');
            if (scrollbar) {
                scrollbar.update();
            }
        },

        suspendEvent: function () {
            this._eventSuspended++;
        },
        resumeEvent: function () {
            this._eventSuspended--;
            if (this._eventSuspended <= 0) {
                this._eventSuspended = 0;
            }
        },

        bind: function (type, data, fn) {
            if (type) {
                var ns = EVENT_NS;
                type = type.split(/\s+/).join(ns + " ");
                this._$host.on(type + ns, data, fn);
            }
        },
        unbind: function (type, fn) {
            if (type) {
                var ns = EVENT_NS;
                type = type.split(/\s+/).join(ns + " ");
                this._$host.off(type + ns, fn);
            }
        },
        unbindAll: function () {
            this._$host.off(EVENT_NS);
        },
        trigger: function (type, data) {
            if (this._eventSuspended === 0) {
                this._$host.trigger(type, data);
            }
        },

        dispose: function (all) {//all: remove items' jquery data
            this.unbindAll();

            if (!all) {
                this.clear();
            }
            this._$host.remove();
        },

        getHost: function () {
            return this._$host;
        },
        refresh: function () {

            if (this.hasGrouped()) {
                var groups = this.getGroups();
                this.createByGroups(groups);
            } else {
                var items = this.getAllItems();
                this.createByItems(items);
            }
        },
        createByGroups: function (groupsData) {
            this.clear();

            var $container = this._creatContainer();
            for (var i = 0, count = groupsData.length; i < count; i++) {
                var groupData = groupsData[i];
                var dfGroup = new DfGroup();
                dfGroup.fromJSON(groupData);

                var $groupView = this._createGroupView(dfGroup, groupData.items);
                $container.append($groupView);
            }
            $container.appendTo(this._$host);
        },
        createByItems: function (items) {
            this.clear();

            var $container = this._creatContainer();
            for (var i = 0, count = items.length; i < count; i++) {
                var $itemView = this._createItemView(items[i]);
                $container.append($itemView);
            }
            $container.appendTo(this._$host);
        },

        _creatContainer: function () {
            var $container = $("<div class='df-groups-view-container view-element'></div>");
            if (this._orientation === Orientation.Horizontal) {
                $container.addClass('h-align');
            }
            return $container;
        },
        _createGroupView: function (group, groupItems) {
            var isHorizontal = (this._orientation === Orientation.Horizontal);

            var $groupView = $("<div class='df-group-view-container view-element'></div>");
            $groupView.data('group', group);
            if (isHorizontal) {
                $groupView.addClass('h-align');
            }

            //group header
            var $groupHeader = this._createHeaderView(group);
            $groupView.append($groupHeader);

            //group body
            var $groupBody = $("<div class='df-group-view-body view-element'></div>");
            if (isHorizontal) {
                $groupBody.addClass('h-align');
            }
            if (groupItems) {
                for (var j = 0, itemCount = groupItems.length; j < itemCount; j++) {
                    $groupBody.append(this._createItemView(groupItems[j]));
                }
            }
            $groupView.append($groupBody);

            //set group state
            this._setGroupState($groupView, !group.getCollapsed());

            return $groupView;
        },
        _createHeaderView: function (group) {
            var self = this;

            var isHorizontal = (this._orientation === Orientation.Horizontal);

            var $groupHeader = $("<div class='df-group-view-header df-text-ellipsis view-element'></div>");
            if (self._canReorder) {
                $groupHeader.attr('draggable', true);
            }
            if (isHorizontal) {
                $groupHeader.addClass('h-align');
            }

            var Utils = df.utils;
            $groupHeader.on('dragstart', Utils.createEventHandler(self, self._startGroupDrag));
            $groupHeader.on('click', Utils.createEventHandler(self, self._onGroupHeaderClick));
            $groupHeader.on('dblclick', Utils.createEventHandler(self, self._onRenameGroup));

            //group state
            var $groupState = $("<span class='df-group-view-state view-element'></span>");
            $groupState.on('click', Utils.createEventHandler(self, self._onGroupStateClick));
            $groupState.on('dblclick', Utils.createEventHandler(self, self._onGroupStateDblClick));
            $groupHeader.append($groupState);

            //header text
            var $groupHeaderText = $("<span class='df-group-view-header-text view-element'></span>");
            $groupHeader.append($groupHeaderText);
            $groupHeaderText.text(group.getHeader());
            $groupHeaderText.attr('title', group.getHeader());

            //header toolbar
            var $groupHeaderToolbar = $("<span class='df-group-view-toolbar view-element'></span>");
            self._createGroupToolbarItemView($groupHeaderToolbar, self._toolbarItems);
            $groupHeader.append($groupHeaderToolbar);

            return $groupHeader;
        },
        _createItemView: function (item) {
            var self = this;

            var $groupItemView = $("<div class='df-group-view-item-container view-element'></div>");
            if (self._canReorder) {
                $groupItemView.attr('draggable', true);
            }
            if (this._orientation === Orientation.Horizontal) {
                $groupItemView.addClass('h-align');
            }

            if (item.parent && item.parent()) {
                item = item.detach();
            }
            $groupItemView.data('item', item);
            $groupItemView.append(item);

            var Utils = df.utils;
            $groupItemView.on('dragstart', Utils.createEventHandler(self, self._startGroupItemDrag));

            return $groupItemView;
        },
        _createGroupToolbarItemView: function ($groupToolbar, toolbarItems) {
            var self = this;

            for (var i = 0, count = toolbarItems.length; i < count; i++) {
                var item = toolbarItems[i];
                var $toolbarItemView = $('<span class="df-group-view-toolbar-item view-element"></span>');
                if (item.className) {
                    $toolbarItemView.addClass(item.className);
                }

                var Utils = df.utils;
                $toolbarItemView.on('click', Utils.createEventHandler(self, self._onGroupToolbarItemClick));

                $toolbarItemView.data('item', item);

                $groupToolbar.append($toolbarItemView);
            }
        },

        _getContainer: function (create) {
            var $container = $(this._$host).children('.df-groups-view-container');
            if (create && $container.length === 0) {
                $container = this._creatContainer();
                $container.appendTo(this._$host);
            }
            return $container;
        },

        _addGroupItemView: function ($groupView, $itemView) {
            var $groupBody = this._getGroupBody($groupView);
            $groupBody.append($itemView);
        },
        _getGroupView: function (groupIdOrItemView) {
            var type = $.type(groupIdOrItemView);
            var isId = (type === 'number' || type === 'string');

            if (isId) {
                var groupId = groupIdOrItemView;
                var groupViews = this._getGroupViews();

                for (var i = 0, count = groupViews.length; i < count; i++) {
                    var $groupView = groupViews[i];
                    var group = $groupView.data('group');

                    if (group && group.getId() === groupId) {
                        return $groupView;
                    }
                }
            } else {
                var $itemView = groupIdOrItemView;
                var $groupView = ($itemView && $itemView.closest('.df-group-view-container'));
                if ($groupView && $groupView.length > 0) {
                    return $groupView;
                }
            }
        },
        _getGroupViews: function () {
            var groupViews = [];
            var $container = this._getContainer();
            $container.children('.df-group-view-container').each(function (i, v) {
                groupViews.push($(v));
            });
            return groupViews;
        },
        _setActiveGroupView: function ($groupView) {
            var $oldGroupView = this._activeGroupView;

            if ($oldGroupView) {
                $oldGroupView.removeClass('active');
            }

            var $itemViews = [];
            if ($groupView) {
                var $itemViews = this._getItemViews($groupView);
                if ($itemViews.length > 0 && !this._isSameGroupView($oldGroupView, $groupView)) {
                    this._setActiveItemView($itemViews[0]);
                }
                $groupView.addClass('active');
            }
            this._activeGroupView = $groupView;

            //
            var oldSelectedItems = this.getSelectedItems();
            this._clearSelectedItems();
            this._addSelectedItems($itemViews);
            this._triggerSelectedItemsChanged(oldSelectedItems, this._selectedItems);
        },
        _isActiveGroupView: function ($groupView) {
            return ($groupView && $groupView.hasClass('active'));
        },
        _isSameGroupView: function ($groupView1, $groupView2) {
            if (!$groupView1 && !$groupView2) {
                return true;
            }

            if ($groupView1 && $groupView2) {
                return ($groupView1.data('group') === $groupView2.data('group'));
            }
        },
        _updateGroupViewActiveState: function ($itemView) {
            var $groupView = this._getGroupView($itemView);
            if (!$groupView) {
                return;
            }

            var $oldGroupView = this._activeGroupView;
            if ($oldGroupView) {
                $oldGroupView.removeClass('active');
            }
            $groupView.addClass('active');

            this._activeGroupView = $groupView;
        },

        _getGroupState: function ($groupView) {
            var $header = this._getGroupHeader($groupView);
            return $header.children('.df-group-view-state');
        },
        _getGroupHeader: function ($groupView) {
            return $groupView.children('.df-group-view-header');
        },
        _getGroupBody: function ($groupView) {
            return $groupView.children('.df-group-view-body');
        },

        _getItemView: function (item) {
            if (!item) {
                return;
            }

            //if (this.hasGrouped()) {
            //    var groupViews = this._getGroupViews();
            //    for (var i = 0, groupCount = groupViews.length; i < groupCount; i++) {
            //        var itemViews = this._getItemViews(groupViews[i]);
            //        for (var j = 0, count = itemViews.length; j < count; j++) {
            //            var $itemView = itemViews[j];
            //            var $itemViewData = this._getItemData($itemView);
            //            if ($itemViewData === item || $itemViewData[0] === item[0] || $itemView[0] === item[0]) {
            //                return $itemView;
            //            }
            //        }
            //    }
            //} else {
            var itemViews = this._getItemViews(this._getContainer());
            for (var i = 0, count = itemViews.length; i < count; i++) {
                var $itemView = itemViews[i];
                if ($itemView[0] === item[0]) {
                    return $itemView;
                }

                var $itemViewData = this._getItemData($itemView);
                if ($itemViewData === item || ($itemViewData && $itemViewData[0] === item[0])) {
                    return $itemView;
                }
            }
            //}
        },
        _getItemViews: function ($ancestorView) {
            var itemViews = [];
            $ancestorView.find('.df-group-view-item-container').each(function (i, v) {
                itemViews.push($(v));
            });
            return itemViews;
        },
        _setActiveItemView: function ($itemView, evt) {
            var $oldItemView = this._activeItemView;
            if (this._isSameItemView($oldItemView, $itemView)) {
                this._updateGroupViewActiveState($itemView);
                return;
            }

            var oldItem = this._getItemData($oldItemView);
            var newItem = this._getItemData($itemView);

            var args = { oldItem: oldItem, newItem: newItem, event: evt, cancel: false };
            this.trigger(EVENTS.ActiveItemChanging, args);
            if (args.cancel) {
                return;
            }

            //group
            this._updateGroupViewActiveState($itemView);

            //item
            if ($oldItemView) {
                $oldItemView.removeClass('active');
            }
            if ($itemView) {
                $itemView.addClass('active');
            }
            this._activeItemView = $itemView;

            this.trigger(EVENTS.ActiveItemChanged, {
                oldItem: oldItem,
                newItem: newItem,
                event: evt
            });

        },
        _isActiveItemView: function ($itemView) {
            return ($itemView && $itemView.hasClass('active'));
        },
        _isSameItemView: function ($itemView1, $itemView2) {
            if (!$itemView1 && !$itemView2) {
                return true;
            }

            if ($itemView1 && $itemView2) {
                return (this._getItemData($itemView1) === this._getItemData($itemView2));
            }
        },

        _clearSelectedItems: function () {
            var items = this._selectedItems;
            items.splice(0, items.length);
        },
        _removeSelectedItem: function ($itemView) {
            if ($itemView.length === 0) {
                return;
            }

            var items = this._selectedItems;
            var item = this._getItemData($itemView);
            for (var i = 0, count = items.length; i < count; i++) {
                if (items[i] === item) {
                    items.splice(i, 1);
                    break;
                }
            }
        },
        _addSelectedItems: function ($itemViews) {
            var selectedItems = this._selectedItems;

            for (var i = 0, count = $itemViews && $itemViews.length; i < count; i++) {
                var $itemView = $itemViews[i];
                if ($itemView.length === 0) {
                    continue;
                }

                var item =this._getItemData($itemView);
                if (!this._hasItem(selectedItems, item)) {
                    selectedItems.push(item);
                }
            }
        },
        _triggerSelectedItemsChanged: function (oldSelectedItems, newSelectedItems) {
            if (!this._areItemsEqual(oldSelectedItems, newSelectedItems)) {
                this.trigger(EVENTS.SelectedItemsChanged, {
                    oldItems: oldSelectedItems,
                    newItems: newSelectedItems
                });
            }
        },
        _getItemIndex: function (items, $itemView) {
            for (var i = 0, count = items.length; i < count; i++) {
                if ($itemView === items[i] || ($itemView && $itemView.is && $itemView.is(items[i])) || (items.is && items.is($itemView))) {
                    return i;
                }
            }
            return -1;
        },
        _hasItem: function (items, $itemView) {
            var index = this._getItemIndex(items, $itemView);
            if (index >= 0) {
                return true;
            }
            return false;
        },
        _getRangeItems: function ($itemView1, $itemView2) {
            var items = [];
            if ($itemView1.length === 0 || $itemView2.length === 0) {
                return items;
            }

            //
            if (this.hasGrouped()) {
                var groupViews = this._getGroupViews();

                var $groupView1 = this._getGroupView($itemView1);
                var $groupView2 = this._getGroupView($itemView2);
                var group1Index = this._getItemIndex(groupViews, $groupView1);
                var group2Index = this._getItemIndex(groupViews, $groupView2);
                if (group1Index > group2Index) { //swap
                    var iv1 = $itemView1;
                    var gv1 = $groupView1;
                    var gi1 = group1Index;

                    $itemView1 = $itemView2;
                    $groupView1 = $groupView2;
                    group1Index = group2Index;

                    $itemView2 = iv1;
                    $groupView2 = gv1;
                    group2Index = gi1;
                }

                var group1ItemViews = this._getItemViews($groupView1);
                var group2ItemViews = this._getItemViews($groupView2);
                var itemView1Index = this._getItemIndex(group1ItemViews, $itemView1);
                var itemView2Index = this._getItemIndex(group2ItemViews, $itemView2);

                if (group1Index === group2Index) {
                    Array.prototype.push.apply(items, group1ItemViews.slice(Math.min(itemView1Index, itemView2Index), Math.max(itemView1Index, itemView2Index) + 1));
                } else {
                    Array.prototype.push.apply(items, group1ItemViews.slice(itemView1Index));
                    for (var i = group1Index + 1; i < group2Index; i++) {
                        Array.prototype.push.apply(items, this._getItemViews(groupViews[i]));
                    }
                    Array.prototype.push.apply(items, group2ItemViews.slice(0, itemView2Index + 1));
                }
            } else {
                var itemViews = this._getItemViews(this._getContainer());
                var itemView1Index = this._getItemIndex(itemViews, $itemView1);
                var itemView2Index = this._getItemIndex(itemViews, $itemView2);
                if (itemView1Index > itemView2Index) {
                    var i1 = itemView1Index;
                    itemView1Index = itemView2Index;
                    itemView2Index = i1;
                }
                Array.prototype.push.apply(items, itemViews.slice(itemView1Index, itemView2Index + 1));
            }

            return items;
        },
        _areItemsEqual: function (itemViews1, itemViews2) {
            if (itemViews1.length !== itemViews2.length) {
                return false;
            }

            for (var i = 0, count = itemViews1.length; i < count; i++) {
                var itemView = itemViews1[i];
                if (!this._hasItem(itemViews2, itemView)) {
                    return false;
                }
            }
            return true;
        },

        _startGroupDrag: function (evt) {
            var self = this;

            if (!self._canReorder) {
                return;
            }

            var $dragGroup = self._getGroupView($(evt.target));
            if ($dragGroup.length === 0) {
                return;
            }

            if (evt) {
                evt.originalEvent.dataTransfer.effectAllowed = 'move';
                evt.originalEvent.dataTransfer.setData('Text', '');//firefox must setData
            }

            //#region DragOver State
            var isHorizontal = (self._orientation === Orientation.Horizontal);

            var lastDragOverGroup;
            function getDragOverGroup(evt) {

                var $target = $(evt.target);
                var groupsView = $target.closest('.df-groups-view').data('groupsView');
                if (groupsView && !groupsView.canReorder()) {
                    return;
                }

                var $groupView, $container;
                if (($groupView = $target.closest('.df-group-view-container')).length > 0) {
                    return { group: $groupView }
                } else if (($container = $target.closest('.df-groups-view')).length > 0) {
                    $container = $container.children('.df-groups-view-container');
                    var $lastGroup = $container.children('.df-group-view-container:last');
                    var isHorizontal = (self._orientation === Orientation.Horizontal);
                    var mouseX = evt.originalEvent.pageX;
                    var mouseY = evt.originalEvent.pageY;

                    var groupOffset = $lastGroup.offset();
                    if ((isHorizontal && mouseX > groupOffset.left) || (!isHorizontal && mouseY > groupOffset.top)) {
                        return { group: $lastGroup };
                    }
                }
            }
            function addDragOverState(evt, dragOverGroup) {
                var $groupView = dragOverGroup.group;

                var mouseX = evt.originalEvent.pageX;
                var mouseY = evt.originalEvent.pageY;

                var groupOffset = $groupView.offset();
                var groupMiddleX = groupOffset.left + $groupView.outerWidth() / 2;
                var groupMiddleY = groupOffset.top + $groupView.outerHeight() / 2;

                if ((isHorizontal && mouseX < groupMiddleX) || (!isHorizontal && mouseY < groupMiddleY)) {
                    $groupView.addClass('drag-over-before');
                    dragOverGroup.position = 'before';
                } else if ((isHorizontal && mouseX >= groupMiddleX) || (!isHorizontal && mouseY >= groupMiddleY)) {
                    $groupView.addClass('drag-over-after');
                    dragOverGroup.position = 'after';
                }
            }
            function clearDragOverState(dragOverGroup) {
                var $groupView = dragOverGroup.group;
                $groupView.removeClass('drag-over-before drag-over-after');
            }
            //#endregion

            //#region DragOver
            var ns = EVENT_NS;
            var $doc = $(self._$host[0].ownerDocument);
            $doc.off(ns);

            $doc.on('dragover' + ns, _docDragOver);
            function _docDragOver(evt) {
                evt.originalEvent.dataTransfer.dropEffect = 'move';
                evt.preventDefault();
                self.collapseAll();

                if (lastDragOverGroup) {
                    clearDragOverState(lastDragOverGroup);
                }

                var dragOverGroup = getDragOverGroup(evt);
                if (dragOverGroup) {
                    addDragOverState(evt, dragOverGroup);
                }
                lastDragOverGroup = dragOverGroup;

            }
            //#endregion

            //#region Drop
            $doc.on('drop' + ns, _docDrop);
            function _docDrop(evt) {
                evt.preventDefault();
                evt.stopPropagation();

                if (!lastDragOverGroup) {
                    return;
                }

                var $dropGroup = lastDragOverGroup.group;
                if ($dropGroup[0] === $dragGroup[0]) {
                    return;
                }

                var position = lastDragOverGroup.position;
                if (position === 'before') {
                    $dragGroup.insertBefore($dropGroup);
                } else if (position === 'after') {
                    $dragGroup.insertAfter($dropGroup);
                }

                self._setGroupState($dragGroup, true);
            }
            //#endregion

            //#region DragEnd
            $dragGroup.on('dragend', groupDragEnd);
            function groupDragEnd(evt) {
                $doc.off("dragover", _docDragOver);
                $doc.off("drop", _docDrop);
                $dragGroup.off('dragend');

                if (lastDragOverGroup) {
                    clearDragOverState(lastDragOverGroup);
                    lastDragOverGroup = null;
                }
            }
            //#endregion
        },

        _startGroupItemDrag: function (evt) {
            var $dragGroupItem = $(evt.target);
            this._startDragItem($dragGroupItem, evt);
        },
        _startDragItem: function ($dragGroupItem, evt) {
            var self = this;

            if (!self._canReorder) {
                return;
            }

            var dragItem = this._getItemData($dragGroupItem);
            if (!dragItem) {
                return;
            }

            if (evt) {
                evt.originalEvent.dataTransfer.effectAllowed = 'move';
                evt.originalEvent.dataTransfer.setData('Text', '');//firefox must setData
            }

            self.trigger(EVENTS.DragStart, { event: evt, item: dragItem });

            //#region DragOver State
            var isHorizontal = (self._orientation === Orientation.Horizontal);

            var lastDragOverItem;
            function getDragOverItem(evt) {
                var $target = $(evt.target);

                var groupsView = $target.closest('.df-groups-view').data('groupsView');
                if (groupsView && !groupsView.canReorder()) {
                    return;
                }

                var hasGrouped = self.hasGrouped();
                var $groupItem, $groupHeader, $group, $container;

                if (($groupItem = $target.closest('.df-group-view-item-container')).length > 0) {
                    return { type: 'groupItem', item: $groupItem };
                } else if (($groupHeader = $target.closest('.df-group-view-header')).length > 0) {
                    return { type: 'groupHeader', item: $groupHeader };
                } else if (($group = $target.closest('.df-group-view-container')).length > 0 && self._getItemViews($group).length === 0) {
                    return { type: 'groupHeader', item: self._getGroupHeader($group) };
                } else if (($container = $target.closest('.df-groups-view')).length > 0) {
                    $container = $container.children('.df-groups-view-container');

                    var $overItem, $overGroup;
                    if (hasGrouped) {
                        var $lastGroup = $container.find('.df-group-view-container:last');
                        if ($lastGroup.data('group').getCollapsed()) {
                            $overGroup = $lastGroup;
                        } else {
                            $overItem = $lastGroup.find('.df-group-view-item-container:last');
                        }
                    } else {
                        $overItem = $container.find('.df-group-view-item-container:last');
                    }

                    var mouseX = evt.originalEvent.pageX;
                    var mouseY = evt.originalEvent.pageY;
                    if ($overItem && $overItem.length > 0) {
                        var itemOffset = $overItem.offset();
                        if ((isHorizontal && mouseX > itemOffset.left) || (!isHorizontal && mouseY > itemOffset.top)) {
                            return { type: 'groupItem', item: $overItem, isOut: true };
                        }
                    } else if ($overGroup && $overGroup.length > 0) {
                        var groupOffset = $overGroup.offset();
                        if ((isHorizontal && mouseX > groupOffset.left) || (!isHorizontal && mouseY > groupOffset.top)) {
                            return { type: 'groupHeader', item: self._getGroupHeader($overGroup), isOut: true };
                        }
                    } else {
                        return { type: 'container', item: $container, };
                    }
                }
            }
            function addDragOverState(evt, dragOverItem) {
                var itemType = dragOverItem.type, $item = dragOverItem.item;

                if (itemType === 'groupItem') {
                    var mouseX = evt.originalEvent.pageX;
                    var mouseY = evt.originalEvent.pageY;

                    var itemOffset = $item.offset();
                    var itemMiddleX = itemOffset.left + $item.outerWidth() / 2;
                    var itemMiddleY = itemOffset.top + $item.outerHeight() / 2;

                    if ((isHorizontal && mouseX < itemMiddleX) || (!isHorizontal && mouseY < itemMiddleY)) {
                        $item.addClass('drag-over-before');
                        dragOverItem.position = 'before';
                    } else if ((isHorizontal && mouseX >= itemMiddleX) || (!isHorizontal && mouseY >= itemMiddleY)) {
                        $item.addClass('drag-over-after');
                        dragOverItem.position = 'after';
                    }

                } else if (itemType === 'groupHeader') {
                    $item.addClass('drag-over');

                    if (!dragOverItem.isOut) {
                        self._setGroupState(self._getGroupView($item), true);
                    }
                }
            }
            function clearDragOverState(dragOverItem) {
                var itemType = dragOverItem.type, $item = dragOverItem.item;
                if (itemType === 'groupItem') {
                    $item.removeClass('drag-over-before drag-over-after');
                } else if (itemType === 'groupHeader') {
                    $item.removeClass('drag-over');
                }
            }
            //#endregion

            //#region DragOver
            var ns = EVENT_NS;
            var $doc = $(self._$host[0].ownerDocument);
            $doc.off(ns);

            $doc.on('dragover' + ns, _docDragOver);
            function _docDragOver(evt) {
                evt.originalEvent.dataTransfer.dropEffect = 'move';
                evt.preventDefault();

                if (lastDragOverItem) {
                    clearDragOverState(lastDragOverItem);
                }

                var dragOverItem = getDragOverItem(evt);
                if (dragOverItem) {
                    addDragOverState(evt, dragOverItem);
                }

                lastDragOverItem = dragOverItem;
            }
            //#endregion

            //#region Drop
            $doc.on('drop' + ns, _docDrop);
            function _docDrop(evt) {
                evt.preventDefault();
                evt.stopPropagation();

                $doc.off("dragover", _docDragOver);
                $doc.off("drop", _docDrop);

                if (!lastDragOverItem) {
                    return;
                }

                var obj = {
                    event: evt, dropInfo: lastDragOverItem, cancel: false, dragItem: $dragGroupItem
                };

                self.trigger(EVENTS.BeforeDrop, obj);

                if (obj.cancel) {
                    clearDragOverState(lastDragOverItem);
                    lastDragOverItem = null;
                    return;
                }

                var $dropGroupItem = lastDragOverItem.item;
                if ($dropGroupItem[0] === $dragGroupItem[0]) {
                    return;
                }

                var dropItemType = lastDragOverItem.type;
                if (dropItemType === 'groupItem') {
                    var position = lastDragOverItem.position;

                    if (position === 'before') {
                        $dragGroupItem.insertBefore($dropGroupItem);
                    } else if (position === 'after') {
                        $dragGroupItem.insertAfter($dropGroupItem);
                    }
                } else if (dropItemType === 'groupHeader') {
                    var $dropGroup = self._getGroupView($dropGroupItem);
                    self._addGroupItemView($dropGroup, $dragGroupItem);
                    self._setGroupState($dropGroup, true);
                } else if (dropItemType === 'container') {
                    if (!self.hasGrouped()) {
                        $dropGroupItem.append($dragGroupItem);
                    }
                }

                clearDragOverState(lastDragOverItem);
                lastDragOverItem = null;

                self._setActiveItemView($dragGroupItem);

                self.trigger(EVENTS.Drop, obj);
            }
            //#endregion

            //#region DragEnd
            $dragGroupItem.on('dragend', itemDragEnd);
            function itemDragEnd(evt) {
                $doc.off("dragover", _docDragOver);
                $doc.off("drop", _docDrop);
                $dragGroupItem.off('dragend');

                if (lastDragOverItem) {
                    clearDragOverState(lastDragOverItem);
                    lastDragOverItem = null;
                }

                self.trigger(EVENTS.DragEnd, { event: evt, item: dragItem });

                evt.preventDefault();
                evt.stopPropagation();
            }
            //#endregion
        },
        _onGroupsViewMouseDown: function (evt) {
            //Fix in IE when press shiftKey will select all element in document
            if (evt.shiftKey) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        },
        _onGroupsViewContextMenu: function (evt) {
            var self = this;

            var $itemView = $(evt.target).closest('.df-group-view-item-container');
            if (!self._hasItem(self._selectedItems, self._getItemData($itemView))) {
                self._onGroupsViewClick(evt);
            }
        },
        _onGroupsViewClick: function (evt) {
            var $newActiveItem = $(evt.target).closest('.df-group-view-item-container');

            var oldSelectedItems = this.getSelectedItems();
            var $oldActiveItem = this._activeItemView;

            var shiftKey = evt.shiftKey, ctrlKey = evt.ctrlKey;
            if (shiftKey && ctrlKey) {
                this._addSelectedItems(this._getRangeItems($oldActiveItem, $newActiveItem));
            } else if (shiftKey) {
                if ($newActiveItem.length > 0) {
                    this._clearSelectedItems();
                    this._addSelectedItems(this._getRangeItems($oldActiveItem, $newActiveItem));
                }
            } else if (ctrlKey) {
                if (this._hasItem(oldSelectedItems, this._getItemData($newActiveItem))) {
                    this._removeSelectedItem($newActiveItem);
                } else {
                    this._addSelectedItems([$newActiveItem]);
                }
            } else {
                this._clearSelectedItems();
                this._addSelectedItems([$newActiveItem]);
            }
            var newSelectedItems = this._selectedItems;
            this._triggerSelectedItemsChanged(oldSelectedItems, newSelectedItems);

            //
            if ($newActiveItem.length > 0) {
                if ((!$oldActiveItem || !shiftKey)) {
                    this._setActiveItemView($newActiveItem, evt);
                }

                //
                this.trigger(EVENTS.ItemClick, {
                    item: this._getItemData($newActiveItem)
                });
            }
        },


        _onGroupStateClick: function (evt) {
            var $group = this._getGroupView($(evt.currentTarget));
            var group = $group && $group.data('group');
            if (group) {
                this._setGroupState($group, group.getCollapsed());
            }
            evt.preventDefault();
            evt.stopPropagation();
        },
        _onGroupStateDblClick: function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
        },
        _onGroupHeaderClick: function (evt) {
            var $groupView = this._getGroupView($(evt.currentTarget));
            this._setActiveGroupView($groupView);
            evt.preventDefault();
            evt.stopPropagation();
        },
        _onRenameGroup: function (evt) {
            if (!this._canRenameGroup) {
                return;
            }

            var $groupHeader = $(evt.currentTarget).closest('.df-group-view-header');
            var $groupView = this._getGroupView($groupHeader);

            var group = $groupView.data('group');
            var oldName = group.getHeader() || '';

            var $editor = $('<input type="text" class="df-group-view-editor"/>');

            $editor.width($groupHeader.outerWidth() - 1);
            $editor.height($groupHeader.outerHeight());

            var $host = this._$host;
            var scrollTop = $host.scrollTop();
            var scrollLeft = $host.scrollLeft();

            var parentOffset = $groupHeader.offsetParent().offset();
            var offset = $groupHeader.offset();

            $editor.css('left', offset.left - parentOffset.left + scrollLeft).css('top', offset.top - parentOffset.top + scrollTop);

            var commit = function (cancel) {
                var newName = $editor.val();
                $editor.remove();

                if (!cancel && newName !== oldName
                    && newName && newName.length) {
                    var obj = { newName: newName, oldName: oldName, cancel: false };
                    self.trigger(EVENTS.GroupRenaming, obj);
                    if (obj.cancel) {
                        return false;
                    }
                    group.setHeader(newName);
                    var $text = $groupHeader.children('.df-group-view-header-text');
                    $text.text(newName);
                    $text.attr('title', newName);
                    self.trigger(EVENTS.GroupRenamed, { group: group.toJSON(), newName: newName, oldName: oldName });
                }
            };

            var self = this;
            $editor.blur(function (e) {
                commit();
            });
            $editor.keydown(function (e) {
                if (e.which === 13) {//enter
                    commit();
                } else if (e.which === 27) { //esc
                    commit(true);
                }
            });

            $groupView.append($editor);
            $editor.val(oldName);
            $editor.focus();

            evt.preventDefault();
            evt.stopPropagation();
        },
        _onGroupToolbarItemClick: function (evt) {
            evt.preventDefault();
            evt.stopPropagation();

            var $toolbarItem = $(evt.currentTarget);
            var toolbarItem = $toolbarItem.data('item');

            var $group = this._getGroupView($toolbarItem);
            var group = $group && $group.data('group');

            this.trigger(EVENTS.GroupToolbarItemClicked, {
                $group: $group,
                group: group && group.toJSON(),
                $item: $toolbarItem,
                item: toolbarItem
            });
        },

        toJSON: function () {
            var self = this;

            var jsonData = {
                orientation: self._orientation,
                canReorder: self._canReorder,
                canGroup: self._canGroup,
                canRenameGroup: self._canRenameGroup,
            };

            if (self.hasGrouped()) {
                jsonData['groups'] = self.getGroups();
            } else {
                jsonData['items'] = self.getAllItems();
            }
            return jsonData;
        },
        fromJSON: function (jsonData) {
            if (!jsonData) {
                return;
            }

            var self = this;
            self.suspendEvent();
            try {
                if (jsonData.orientation !== undefined) {
                    self._orientation = jsonData.orientation;
                }
                if (jsonData.canReorder !== undefined) {
                    self._canReorder = jsonData.canReorder;
                }
                if (jsonData.canGroup !== undefined) {
                    self._canGroup = jsonData.canGroup;
                }
                if (jsonData.canRenameGroup !== undefined) {
                    self._canRenameGroup = jsonData.canRenameGroup;
                }

                var groupsData, itemsData;
                if (groupsData = jsonData['groups']) {
                    self.createByGroups(groupsData);
                } else if (itemsData = jsonData['items']) {
                    self.createByItems(itemsData);
                }
            } finally {
                self.resumeEvent();
            }
        }
    });
    df.DfGroupsView = DfGroupsView;
    //#endregion

    //#region DfGroup
    function DfGroup(id) {
        this.id = id;
        this.header = '';
        this.collapsed = false;
    }

    _implements(DfGroup, {
        getId: function () {
            return this.id;
        },

        getHeader: function () {
            return this.header;
        },
        setHeader: function (header) {
            this.header = header;
        },

        getCollapsed: function () {
            return this.collapsed;
        },
        setCollapsed: function (collapsed) {
            this.collapsed = collapsed;
        },

        toJSON: function () {
            var jsonData = {
                id: this.id,
                header: this.header,
                collapsed: this.collapsed,
            };
            return jsonData;
        },
        fromJSON: function (jsonData) {
            if (!jsonData) {
                return;
            }

            this.id = jsonData.id;
            this.header = jsonData.header;
            this.collapsed = jsonData.collapsed;
        }
    });
    //#endregion

})(jQuery, df);



