import {
  Directive, ElementRef, Input, Output, HostBinding, HostListener, EventEmitter, OnInit,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import * as domHelper from '../../helpers/dom.helper';

@Directive({ standalone: false, selector: '[sideNavAccordion]' })
export class SideNavAccordionDirective implements OnInit {
  constructor(private el: ElementRef) {
  }
  ngOnInit() {
    const self = this;
    // the internal development record: the item's mirrored content layers (were Material's .mdc-list-item__content >
    // .mat-mdc-list-item-unscoped-content > mat-nav-list)
    var subMenu = this.el.nativeElement.querySelector(
      '.fc-nav-item__content > .fc-nav-item__text > .fc-nav-list',
    );
    const isCollapsed = domHelper.hasClass(document.body, 'collapsed-menu');
    if (subMenu) { this.el.nativeElement.className += ' has-submenu'; }

    // remove open class that is added my router
    if (isCollapsed) {
      setTimeout(() => {
        domHelper.removeClass(self.el.nativeElement, 'open');
      });
    }
  }

  @HostListener('click', ['$event'])
  onClick($event) {
    const parentLi = this.el.nativeElement;
    const target = $event.target as Element;

    if (target.closest('.sub-menu')) {
      return;
    }

    domHelper.addClass($event.target.parentElement, 'highlight');
    setTimeout(() => { domHelper.removeClass($event.target.parentElement, 'highlight'); }, 100);
    if (!domHelper.hasClass(parentLi, 'has-submenu')) {
      // PREVENTS CLOSING PARENT ITEM
      return;
    }
    this.toggleOpen();
  }

  // For collapsed sidebar
  @HostListener('mouseenter', ['$event'])
  onMouseEnter($event) {
    const elem = this.el.nativeElement;
    const isCollapsed = domHelper.hasClass(document.body, 'collapsed-menu');
    if (!isCollapsed) { return; }
    domHelper.addClass(elem, 'open');
  }
  @HostListener('mouseleave', ['$event'])
  onMouseLeave($event) {
    const elem = this.el.nativeElement;
    const isCollapsed = domHelper.hasClass(document.body, 'collapsed-menu');
    if (!isCollapsed) { return; }
    domHelper.removeClass(elem, 'open');
  }

  private toggleOpen() {
    var elem = this.el.nativeElement;
    var parenMenuItems = document.getElementsByClassName('has-submenu');

    if (domHelper.hasClass(elem, 'open')) {
      domHelper.removeClass(parenMenuItems, 'open');
    } else {
      domHelper.removeClass(parenMenuItems, 'open');
      domHelper.addClass(elem, 'open');
    }
  }
}
